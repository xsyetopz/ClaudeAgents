import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");
const FIXTURES = path.join(import.meta.dir, "fixtures");

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

async function runCli(args: string[], cwd: string = process.cwd()) {
	const proc = Bun.spawn(["bun", CLI, ...args], {
		cwd,
		stderr: "pipe",
		stdout: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

describe("Olympus CLI/interactive parity command surface", () => {
	test("help output includes grouped command areas and blocked legacy surfaces", async () => {
		const result = await runCli(["--help"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Core package commands:");
		expect(result.stdout).toContain("Plan, install, uninstall:");
		expect(result.stdout).toContain("Status, setup, acceptance:");
		expect(result.stdout).toContain("Safety and runtime policy:");
		expect(result.stdout).toContain("Provider renderers");
	});

	test("aliases route to implemented Olympus commands", async () => {
		const evaluate = await runCli([
			"evaluate",
			fixturePath("passive-package"),
			"--json",
		]);
		expect(evaluate.exitCode).toBe(0);
		expect(JSON.parse(evaluate.stdout).decision).toBe("trust-passive");

		const risk = await runCli([
			"risk",
			fixturePath("passive-package"),
			"--json",
		]);
		expect(risk.exitCode).toBe(0);
		expect(JSON.parse(risk.stdout).command).toBe("report package-risk");

		const accept = await runCli(["accept", "--json"]);
		expect(accept.exitCode).toBe(0);
		expect(JSON.parse(accept.stdout).command).toBe("report acceptance");
	});

	test("JSON error output uses stable shape without stack traces", async () => {
		const result = await runCli(["definitely-not-oal", "--json"]);
		expect(result.exitCode).toBe(2);
		const error = JSON.parse(result.stderr);
		expect(error).toEqual({
			schemaVersion: 1,
			ok: false,
			error: {
				message: "unknown command: definitely-not-oal",
				exitCode: 2,
				code: "MALFORMED_USAGE_OR_INPUT",
			},
		});
		expect(result.stderr).not.toContain("at ");
	});

	test("plan uninstall reports exact manifest-authorized actions", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympus-cli-plan-"));
		try {
			const install = await runCli(
				[
					"install",
					fixturePath("passive-package"),
					"--project",
					"--apply",
					"--json",
				],
				tempRoot,
			);
			expect(install.exitCode).toBe(0);
			const packageId = JSON.parse(install.stdout).packageId;
			const plan = await runCli(
				["plan", "uninstall", packageId, "--json"],
				tempRoot,
			);
			expect(plan.exitCode).toBe(0);
			const report = JSON.parse(plan.stdout);
			expect(report.wouldRead).toContain(".pi/olympus/olympus-manifest.json");
			expect(report.wouldRemove).toContain(".pi/settings.json packages entry");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("setup status is read-only and detects empty project state", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-cli-setup-"),
		);
		try {
			const result = await runCli(["setup", "status", "--json"], tempRoot);
			expect(result.exitCode).toBe(1);
			const report = JSON.parse(result.stdout);
			expect(report.command).toBe("setup status");
			expect(report.configured.projectPiPresent).toBe(false);
			expect(report.mutationPolicy).toBe("read-only");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("provider renderer compatibility commands are not restored", async () => {
		const result = await runCli(["deploy", "--json"]);
		expect(result.exitCode).toBe(2);
		expect(JSON.parse(result.stderr).error.message).toBe(
			"unknown command: deploy",
		);
	});
});
