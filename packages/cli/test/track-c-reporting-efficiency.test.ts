import { describe, expect, test } from "bun:test";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPassiveInstall } from "lifecycle";
import {
	buildContextCompactionAdvice,
	buildHandoffReport,
	buildPackageRiskReport,
	buildStatusReport,
	compactText,
	detectRtk,
	getOlympusCatalog,
	parsePiStatusline,
} from "reporting";
import { loadQuotaStatus } from "safety";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");
const FIXTURES = path.join(import.meta.dir, "fixtures");
const PI_STATUSLINE = "↑399k ↓39k R7.1M $6.720 (sub) 52.5%/272k (auto)";

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

describe("Track C RTK status and command policy", () => {
	test("detects RTK when a fake rtk executable exists on PATH", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympus-rtk-"));
		try {
			const fakeRtk = path.join(tempRoot, "rtk");
			await writeFile(fakeRtk, "#!/bin/sh\necho fake rtk\n");
			await chmod(fakeRtk, 0o755);
			const report = detectRtk({ PATH: tempRoot });
			expect(report.status).toBe("available");
			expect(report.path).toBe(fakeRtk);
			expect(
				report.recommendations.some(
					(recommendation) =>
						recommendation.category === "git-diff-status-log" &&
						recommendation.recommendation.includes("RTK-backed"),
				),
			).toBe(true);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("records fallback/degraded reason when RTK is unavailable", () => {
		const report = detectRtk({ PATH: "" });
		expect(report.status).toBe("unavailable");
		expect(report.degradedReason).toContain("not found on PATH");
	});
});

describe("Track C fallback compaction", () => {
	test("keeps failing tests and error messages visible", () => {
		const report = compactText({
			text: "FAIL packages/olympus/test/sample.test.ts\n✗ rejects unsafe write\nError: expected true to be false\nexit code: 1\n",
			kind: "test",
			env: { PATH: "" },
			exitStatus: 1,
		});
		expect(report.fallbackReason).toContain("not found on PATH");
		expect(report.criticalContext.join("\n")).toContain("rejects unsafe write");
		expect(report.criticalContext.join("\n")).toContain("Error: expected");
		expect(report.exitStatus).toBe(1);
	});

	test("redacts secret-looking output before summary and supports raw fallback", () => {
		const report = compactText({
			text: "Error: failed request\napi_key=sk-1234567890abcdef\n",
			kind: "stack-trace",
			mode: "raw",
			env: { PATH: "" },
		});
		expect(report.redactions.length).toBeGreaterThan(0);
		expect(report.rawOutput).toContain("[REDACTED:");
		expect(report.rawOutput).not.toContain("sk-1234567890abcdef");
		expect(report.warnings).toContain(
			"Secret-looking output was redacted before compaction.",
		);
	});

	test("compacted diff preserves filenames and deletion markers", () => {
		const report = compactText({
			text: "diff --git a/src/old.ts b/src/old.ts\ndeleted file mode 100644\n--- a/src/old.ts\n+++ /dev/null\n-DANGER\n",
			kind: "git",
			env: { PATH: "" },
		});
		const joined = [...report.summary, ...report.criticalContext].join("\n");
		expect(joined).toContain("src/old.ts");
		expect(joined).toContain("deleted file mode");
	});
});

describe("Track C deterministic reports and quota", () => {
	test("status report is deterministic and handoff is compact/actionable", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-track-c-status-"),
		);
		try {
			await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			const first = await buildStatusReport(projectRoot);
			const second = await buildStatusReport(projectRoot);
			expect(first.deterministicDigest).toBe(second.deterministicDigest);
			expect(first.reportPaths.status).toBe(".pi/olympus/reports/status.json");
			const handoff = await buildHandoffReport(projectRoot);
			expect(handoff.markdown).toContain("# Olympus Handoff");
			expect(handoff.actionItems.join("\n")).toContain("RTK");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("package risk report is deterministic", async () => {
		const first = await buildPackageRiskReport(fixturePath("passive-package"));
		const second = await buildPackageRiskReport(fixturePath("passive-package"));
		expect(first.deterministicDigest).toBe(second.deterministicDigest);
		expect(first.labels).toContain("PASSIVE");
	});

	test("catalog has no stale active-OAL claims", () => {
		const serialized = JSON.stringify(getOlympusCatalog()).toLowerCase();
		expect(serialized).not.toContain("openagentlayer");
		expect(serialized).not.toContain("active oal");
		expect(serialized).not.toContain("oal vnext");
	});

	test("quota profile loads and unknown quota is labeled unknown", async () => {
		const projectRoot = await mkdtemp(path.join(os.tmpdir(), "olympus-quota-"));
		try {
			await mkdir(path.join(projectRoot, ".pi", "olympus", "quota"), {
				recursive: true,
			});
			await writeFile(
				path.join(projectRoot, ".pi", "olympus", "quota", "profile.json"),
				'{"profile":"pro-5x"}\n',
			);
			const configured = await loadQuotaStatus(projectRoot);
			expect(configured.profile).toBe("pro-5x");
			expect(configured.expensiveWorkflowWarning).toContain("Output-heavy");
			const unknown = await loadQuotaStatus(path.join(projectRoot, "missing"));
			expect(unknown.profile).toBe("unknown");
			expect(unknown.limits).toBe("unknown");
			expect(unknown.localUsageEstimate.implementationDetail).toContain(
				"codex-lb",
			);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Pi statusline context recommends post-handoff /compact at threshold", () => {
		const advice = buildContextCompactionAdvice({
			statusline: PI_STATUSLINE,
			afterHandoff: true,
		});
		expect(advice.statusline.contextSource).toBe("pi-footer-getContextUsage");
		expect(advice.statusline.contextSegment).toBe("52.5%/272k (auto)");
		expect(advice.statusline.contextWindowTokens).toBe(272000);
		expect(advice.statusline.contextPercent).toBe(52.5);
		expect(advice.shouldRunPiCompact).toBe(true);
		expect(advice.nextCommand).toBe("/compact");
	});

	test("Pi context parser follows installed footer format for unknown post-compaction tokens", () => {
		const parsed = parsePiStatusline("↑1.2k ?/200k (auto) claude-sonnet");
		expect(parsed.contextWindowTokens).toBe(200000);
		expect(parsed.contextPercent).toBeNull();
		expect(parsed.autoCompact).toBe(true);
		expect(parsed.parseWarnings.join("\n")).toContain(
			"current context tokens as unknown",
		);
	});

	test("explicit report and handoff artifact writes are project-local", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-artifacts-"),
		);
		try {
			const handoffProc = Bun.spawn(
				[
					"bun",
					CLI,
					"report",
					"handoff",
					"--write",
					"--statusline",
					PI_STATUSLINE,
					"--json",
				],
				{ cwd: projectRoot },
			);
			const [handoffStdout, handoffExit] = await Promise.all([
				new Response(handoffProc.stdout).text(),
				handoffProc.exited,
			]);
			expect(handoffExit).toBe(0);
			const handoff = JSON.parse(handoffStdout);
			expect(handoff.path).toBe(".pi/olympus/handoff/current.md");
			expect(handoff.compactAdvice.nextCommand).toBe("/compact");
			const markdown = await readFile(
				path.join(projectRoot, ".pi", "olympus", "handoff", "current.md"),
				"utf8",
			);
			expect(markdown).toContain("Next Pi command: `/compact`");

			const statusProc = Bun.spawn(
				["bun", CLI, "report", "status", "--write", "--json"],
				{ cwd: projectRoot },
			);
			const [statusStdout, statusExit] = await Promise.all([
				new Response(statusProc.stdout).text(),
				statusProc.exited,
			]);
			expect(statusExit).toBe(0);
			expect(JSON.parse(statusStdout).path).toBe(
				".pi/olympus/reports/status.json",
			);
			await expect(
				readFile(
					path.join(projectRoot, ".pi", "olympus", "reports", "status.json"),
					"utf8",
				),
			).resolves.toContain('"command": "status"');
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("explicit audit append writes only project-local audit log", async () => {
		const projectRoot = await mkdtemp(path.join(os.tmpdir(), "olympus-audit-"));
		try {
			const proc = Bun.spawn(
				[
					"bun",
					CLI,
					"audit",
					"append",
					"handoff",
					"--detail",
					"handoff complete",
					"--apply",
					"--json",
				],
				{ cwd: projectRoot },
			);
			const [stdout, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout).path).toBe(".pi/olympus/audit.jsonl");
			const audit = await readFile(
				path.join(projectRoot, ".pi", "olympus", "audit.jsonl"),
				"utf8",
			);
			expect(audit).toContain("handoff complete");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});
});

describe("Track C CLI smoke and no global Pi writes", () => {
	test("low-level CLI commands emit JSON", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-track-c-cli-"),
		);
		try {
			const outputFile = path.join(tempRoot, "output.txt");
			await writeFile(outputFile, "FAIL sample.test.ts\nError: boom\n");
			const commands = [
				["report", "status", "--json"],
				[
					"context",
					"compact-advice",
					"--statusline",
					PI_STATUSLINE,
					"--after-handoff",
					"--json",
				],
				["report", "handoff", "--json"],
				["report", "acceptance", "--json"],
				["compact", outputFile, "--json"],
				["rtk", "status", "--json"],
				["quota", "status", "--json"],
			];
			for (const args of commands) {
				const proc = Bun.spawn(["bun", CLI, ...args], { cwd: tempRoot });
				const [stdout, exitCode] = await Promise.all([
					new Response(proc.stdout).text(),
					proc.exited,
				]);
				expect([0, 1]).toContain(exitCode);
				expect(JSON.parse(stdout).schemaVersion).toBe(1);
			}
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("reporting commands do not write to HOME ~/.pi by default", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-track-c-home-"),
		);
		try {
			const fakeHome = path.join(tempRoot, "fake-home");
			const proc = Bun.spawn(["bun", CLI, "quota", "status", "--json"], {
				cwd: tempRoot,
				env: { ...process.env, HOME: fakeHome },
			});
			const exitCode = await proc.exited;
			expect(exitCode).toBe(0);
			await expect(
				readFile(path.join(fakeHome, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
