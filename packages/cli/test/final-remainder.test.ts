import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildMutationQueuePlan, installFirstPartyResources } from "authoring";
import { installAegisProjectExtension } from "extensions";
import { readProfileStatus, setProjectProfile } from "lifecycle";
import { planRtkCommand } from "reporting";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

describe("Final Olympi remainder", () => {
	test("RTK command planning is advisory and command-form aware", () => {
		const plan = planRtkCommand("git diff --stat", { PATH: "" });
		expect(plan.category).toBe("git-diff-status-log");
		expect(plan.recommendedForm).toContain("rtk capture");
		expect(plan.reasons.join("\n")).toContain("does not execute");
	});

	test("first-party resources install is project-local and explicit", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-resources-install-"),
		);
		try {
			const dryRun = await installFirstPartyResources({
				projectRoot,
				apply: false,
			});
			expect(dryRun.wouldWrite).toContain(".pi/settings.json packages entry");
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
			const applied = await installFirstPartyResources({
				projectRoot,
				apply: true,
			});
			expect(applied.written.length).toBeGreaterThan(0);
			const settings = await readFile(
				path.join(projectRoot, ".pi", "settings.json"),
				"utf8",
			);
			expect(settings).toContain("first-party-resources");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Aegis project install writes only project-local extension entrypoint", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-aegis-install-"),
		);
		try {
			const dryRun = await installAegisProjectExtension({
				projectRoot,
				apply: false,
			});
			expect(dryRun.wouldWrite).toEqual([".pi/extensions/olympi-aegis.ts"]);
			const applied = await installAegisProjectExtension({
				projectRoot,
				apply: true,
			});
			expect(applied.written).toEqual([".pi/extensions/olympi-aegis.ts"]);
			const source = await readFile(
				path.join(projectRoot, ".pi", "extensions", "olympi-aegis.ts"),
				"utf8",
			);
			expect(source).toContain("createAegisPiExtension");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("profile UX is project-local and not provider-renderer compatibility", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-profile-"),
		);
		try {
			const unset = await readProfileStatus(projectRoot);
			expect(unset.profile).toBeNull();
			const report = await setProjectProfile({
				projectRoot,
				name: "Review Mode",
				apply: true,
			});
			expect(report.profile.name).toBe("review-mode");
			expect(report.profile.providerRendererCompatibility).toBe(false);
			expect(report.written).toEqual([".pi/olympi/profile.json"]);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("mutation queue plan serializes shared manifest targets", () => {
		const plan = buildMutationQueuePlan([
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/olympi-manifest.json",
			"packages/cli/src/cli.ts",
		]);
		expect(plan.parallelSafe).toBe(false);
		expect(plan.reasons.join("\n")).toContain("serialized");
	});

	test("new CLI remainder commands emit JSON", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-remainder-cli-"),
		);
		try {
			const commands = [
				["rtk", "plan", "git", "diff", "--json"],
				["profile", "status", "--json"],
				["lock", "queue", ".pi/settings.json", "packages/x.ts", "--json"],
				["resources", "install", "--project", "--dry-run", "--json"],
				["hooks", "aegis-install", "--project", "--dry-run", "--json"],
			];
			for (const args of commands) {
				const proc = Bun.spawn(["bun", CLI, ...args], { cwd: projectRoot });
				const [stdout, exitCode] = await Promise.all([
					new Response(proc.stdout).text(),
					proc.exited,
				]);
				expect(exitCode).toBe(0);
				expect(JSON.parse(stdout).schemaVersion).toBe(1);
			}
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});
});
