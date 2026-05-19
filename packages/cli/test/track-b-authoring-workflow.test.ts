import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OlympiResourceMetadata } from "authoring";
import {
	applyHephaestusPlan,
	buildCurrentHandoff,
	buildPromptContract,
	FIRST_PARTY_RESOURCE_METADATA,
	hephaestusPlanDigest,
	proveHephaestusApplyGate,
	reviewDiffFile,
	reviewPlanFile,
	runModuleDry,
	validateResourceSet,
	validateResources,
	writeFirstPartyResourcePackage,
} from "authoring";
import { detectRtk } from "reporting";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

function hashText(text: string): string {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

describe("Track B first-party resources", () => {
	test("skill and prompt metadata validates", async () => {
		const report = await validateResources();
		expect(report.valid).toBe(true);
		expect(
			report.resources.some((resource) => resource.name === "safety-review"),
		).toBe(true);
		expect(
			report.resources.some((resource) => resource.name === "prompt-contract"),
		).toBe(true);
	});

	test("command collision is detected", async () => {
		const first = FIRST_PARTY_RESOURCE_METADATA[0];
		const second = FIRST_PARTY_RESOURCE_METADATA[1];
		expect(first).toBeDefined();
		expect(second).toBeDefined();
		if (first === undefined || second === undefined) return;
		const resources: OlympiResourceMetadata[] = [
			{ ...first, name: "a", commands: ["same"] },
			{ ...second, name: "b", commands: ["same"] },
		];
		const findings = await validateResourceSet(resources);
		expect(
			findings.some((finding) => finding.message.includes("command collision")),
		).toBe(true);
	});

	test("support files are generated and hashed", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-resources-"));
		try {
			const plan = await writeFirstPartyResourcePackage(tempRoot, true);
			expect(plan.written.length).toBeGreaterThan(0);
			const supportText = await readFile(
				path.join(
					tempRoot,
					"resources",
					"skills",
					"safety-review",
					"README.md",
				),
				"utf8",
			);
			const resourceFile = path.join(tempRoot, "resources.json");
			const safetyReview = FIRST_PARTY_RESOURCE_METADATA.find(
				(resource) => resource.name === "safety-review",
			);
			expect(safetyReview).toBeDefined();
			if (safetyReview === undefined) return;
			await writeFile(
				resourceFile,
				JSON.stringify({
					resources: [
						{
							...safetyReview,
							supportFiles: [
								{
									path: "resources/skills/safety-review/README.md",
									hash: hashText(supportText),
								},
							],
						},
					],
				}),
			);
			const report = await validateResources(resourceFile);
			expect(report.valid).toBe(true);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});

describe("Track B prompt/review artifacts", () => {
	test("prompt contract preserves user paths and constraints", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-contract-"));
		try {
			const promptFile = path.join(tempRoot, "prompt.md");
			await writeFile(
				promptFile,
				"Update packages/cli/src/cli.ts\nMust not write ~/.pi\nRun bun run olympi:test\n",
			);
			const contract = await buildPromptContract(promptFile);
			expect(contract.inspectedSurfaces).toContain("packages/cli/src/cli.ts");
			expect(contract.constraints.join("\n")).toContain("Must not write ~/.pi");
			expect(contract.compactOutput).toBe(true);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("unapproved write plan and approval digest mismatch are blocked", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-plan-"));
		try {
			const planFile = path.join(tempRoot, "plan.json");
			await writeFile(
				planFile,
				'{"writes":["packages/cli/src/x.ts"],"allowedPaths":[]}\n',
			);
			const unapproved = await reviewPlanFile(planFile);
			expect(unapproved.decision).toBe("blocked");
			expect(unapproved.reasons.join("\n")).toContain(
				"unapproved write plan blocked",
			);
			await writeFile(
				planFile,
				'{"approved":true,"approvedDigest":"sha256:wrong","writes":[],"allowedPaths":[]}\n',
			);
			const mismatch = await reviewPlanFile(planFile);
			expect(mismatch.reasons.join("\n")).toContain("approval digest mismatch");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("Hephaestus apply proof requires digest, allowlist, manifest ownership, and Themis", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-hephaestus-"),
		);
		try {
			const planSubject = {
				writes: [".pi/olympi/reports/status.json"],
				allowedPaths: [".pi/olympi/reports/status.json"],
				manifestOwnedPaths: [".pi/olympi/reports/status.json"],
				operations: [],
			};
			const approvedDigest = hephaestusPlanDigest(planSubject);
			const planFile = path.join(tempRoot, "plan.json");
			await writeFile(
				planFile,
				JSON.stringify({
					...planSubject,
					approvedDigest,
					themisDecision: "allow",
				}),
			);
			const proof = await proveHephaestusApplyGate(planFile);
			expect(proof.decision).toBe("proven");
			expect(proof.applyEnabled).toBe(true);
			await writeFile(
				planFile,
				JSON.stringify({ ...planSubject, approvedDigest: "sha256:wrong" }),
			);
			const blocked = await proveHephaestusApplyGate(planFile);
			expect(blocked.decision).toBe("blocked");
			expect(blocked.reasons.join("\n")).toContain("approved digest");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("Hephaestus applies only fully proven write operations", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-hephaestus-apply-"),
		);
		try {
			const target = ".pi/olympi/generated/out.txt";
			const planSubject = {
				writes: [target],
				allowedPaths: [target],
				manifestOwnedPaths: [target],
				operations: [{ kind: "write", path: target, content: "approved\n" }],
			};
			const planFile = path.join(tempRoot, "plan.json");
			await writeFile(
				planFile,
				JSON.stringify({
					...planSubject,
					approvedDigest: hephaestusPlanDigest(planSubject),
					themisDecision: "allow",
				}),
			);
			const dryRun = await applyHephaestusPlan(planFile, {
				projectRoot: tempRoot,
				apply: false,
			});
			expect(dryRun.blocked).toBe(false);
			expect(dryRun.wouldWrite).toEqual([target]);
			const applied = await applyHephaestusPlan(planFile, {
				projectRoot: tempRoot,
				apply: true,
			});
			expect(applied.blocked).toBe(false);
			expect(await readFile(path.join(tempRoot, target), "utf8")).toBe(
				"approved\n",
			);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("CLI Hephaestus apply writes approved operation paths", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-hephaestus-cli-"),
		);
		try {
			const target = ".pi/olympi/generated/cli.txt";
			const planSubject = {
				writes: [target],
				allowedPaths: [target],
				manifestOwnedPaths: [target],
				operations: [{ kind: "write", path: target, content: "cli\n" }],
			};
			const planFile = path.join(tempRoot, "plan.json");
			await writeFile(
				planFile,
				JSON.stringify({
					...planSubject,
					approvedDigest: hephaestusPlanDigest(planSubject),
					themisDecision: "allow",
				}),
			);
			const proc = Bun.spawn(
				[
					"bun",
					CLI,
					"module",
					"hephaestus",
					"apply",
					planFile,
					"--apply",
					"--json",
				],
				{ cwd: tempRoot },
			);
			const [stdout, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout).blocked).toBe(false);
			expect(await readFile(path.join(tempRoot, target), "utf8")).toBe("cli\n");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("diff review preserves changed and deleted files", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-diff-"));
		try {
			const diffFile = path.join(tempRoot, "diff.patch");
			await writeFile(
				diffFile,
				"diff --git a/old.ts b/old.ts\ndeleted file mode 100644\n",
			);
			const review = await reviewDiffFile(diffFile);
			expect(review.decision).toBe("needs-edit");
			expect(
				review.annotations.some(
					(annotation) =>
						annotation.path === "old.ts" &&
						annotation.message === "deleted file",
				),
			).toBe(true);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});

describe("Track B module shells and Hermes", () => {
	test("bounded modules enforce authorities", () => {
		expect(runModuleDry("athena", true, { write: true }).reasons).toContain(
			"Athena cannot write or apply plans",
		);
		expect(runModuleDry("themis", true).reasons).toContain(
			"Themis blocks unsafe action",
		);
		expect(
			runModuleDry("apollo", true, { verifyCommand: "rm -rf ." }).reasons,
		).toContain("Apollo rejects commands outside allowlist");
		expect(
			runModuleDry("hestia", true, { path: "tmp/out.json" }).reasons,
		).toContain("Hestia refuses writes outside .pi/olympi");
		expect(runModuleDry("hephaestus", true).reasons.join("\n")).toContain(
			"missing plan digest",
		);
		expect(runModuleDry("moirai", true).dependencyGraph.length).toBeGreaterThan(
			0,
		);
	});

	test("Hermes produces compact handoff without secrets", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-hermes-"));
		try {
			const handoff = await buildCurrentHandoff(tempRoot);
			expect(handoff.compact).toBe(true);
			expect(handoff.markdown).toContain("# Olympi Handoff");
			expect(handoff.markdown).not.toContain("sk-1234567890abcdef");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("RTK-aware guidance appears when fake RTK is available", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-rtk-b-"));
		try {
			const fakeRtk = path.join(tempRoot, "rtk");
			await writeFile(fakeRtk, "#!/bin/sh\necho rtk\n");
			await Bun.$`chmod +x ${fakeRtk}`;
			const status = detectRtk({ PATH: tempRoot });
			expect(status.status).toBe("available");
			expect(
				status.recommendations.map((entry) => entry.recommendation).join("\n"),
			).toContain("RTK-backed");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});

describe("Track B CLI smoke and no global Pi writes", () => {
	test("low-level CLI workflow commands emit JSON", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-track-b-cli-"),
		);
		try {
			const promptFile = path.join(tempRoot, "prompt.md");
			const planFile = path.join(tempRoot, "plan.json");
			const diffFile = path.join(tempRoot, "diff.patch");
			await writeFile(
				promptFile,
				"Change packages/cli/src/index.ts\nMust preserve constraints\n",
			);
			await writeFile(
				planFile,
				'{"writes":[],"allowedPaths":[],"approved":true}\n',
			);
			await writeFile(diffFile, "diff --git a/a.ts b/a.ts\n");
			const commands = [
				["resources", "validate", "--json"],
				["prompt", "contract", promptFile, "--json"],
				["review", "plan", planFile, "--json"],
				["review", "diff", diffFile, "--json"],
				["handoff", "current", "--json"],
				["module", "status", "--json"],
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

	test("module commands do not write to HOME ~/.pi by default", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-track-b-home-"),
		);
		try {
			const fakeHome = path.join(tempRoot, "fake-home");
			const proc = Bun.spawn(["bun", CLI, "module", "status", "--json"], {
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
