import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	applyManifestUninstall,
	applyPassiveInstall,
	loadExecutablePackage,
	planExecutableInstall,
	planManifestUninstall,
	planPassiveInstall,
	stageExecutableInstall,
} from "lifecycle";

const FIXTURES = path.join(import.meta.dir, "fixtures");
const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

describe("Olympus project-local passive install", () => {
	test("dry-runs passive mirror install without project writes", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-install-plan-"),
		);
		try {
			const report = await planPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: false,
			});
			expect(report.blocked).toBe(false);
			expect(report.apply).toBe(false);
			expect(report.settingsEntry.extensions).toEqual([]);
			expect(report.settingsEntry.skills).toEqual([
				"+skills/reviewer/SKILL.md",
			]);
			expect(report.wouldWrite).toContain(".pi/settings.json packages entry");
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("applies passive mirror install with manifest ownership and no global writes", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-install-apply-"),
		);
		const projectRoot = path.join(tempRoot, "project");
		const fakeHomeMarker = path.join(
			tempRoot,
			"fake-home",
			".pi",
			"marker.json",
		);
		try {
			const report = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			expect(report.blocked).toBe(false);
			const settings = JSON.parse(
				await readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			);
			expect(settings.packages).toHaveLength(1);
			expect(settings.packages[0].source).toBe(
				`./olympus/packages/${report.packageId}/package`,
			);
			const mirrorPackage = JSON.parse(
				await readFile(
					path.join(
						projectRoot,
						".pi",
						"olympus",
						"packages",
						report.packageId,
						"package",
						"package.json",
					),
					"utf8",
				),
			);
			expect(mirrorPackage.pi.extensions).toEqual([]);
			expect(mirrorPackage.pi.prompts).toEqual(["prompts/review.md"]);
			const manifest = JSON.parse(
				await readFile(
					path.join(projectRoot, ".pi", "olympus", "olympus-manifest.json"),
					"utf8",
				),
			);
			expect(manifest.packages[0].packageId).toBe(report.packageId);
			expect(manifest.packages[0].files.length).toBeGreaterThan(0);
			await expect(readFile(fakeHomeMarker, "utf8")).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("blocks executable package install", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-install-block-"),
		);
		try {
			const report = await planPassiveInstall({
				source: fixturePath("mixed-package"),
				projectRoot,
				apply: false,
			});
			expect(report.blocked).toBe(true);
			expect(report.reason).toContain("executable resources");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("stages and loads executable package only after trust lock signature and sandbox gates", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-executable-load-"),
		);
		try {
			const plan = await planExecutableInstall({
				source: fixturePath("mixed-package"),
				projectRoot,
				apply: false,
			});
			expect(plan.blocked).toBe(false);
			const signatureDigest = plan.signatureSubjectDigest;
			expect(signatureDigest).toStartWith("sha256:");
			if (signatureDigest === undefined)
				throw new Error("missing signature digest");
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
			const staged = await stageExecutableInstall({
				source: fixturePath("mixed-package"),
				projectRoot,
				apply: true,
				signatureDigest,
			});
			expect(staged.blocked).toBe(false);
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
			const blockedLoad = await loadExecutablePackage({
				packageId: staged.packageId,
				projectRoot,
				apply: true,
				sandboxReady: false,
			});
			expect(blockedLoad.blocked).toBe(true);
			const loaded = await loadExecutablePackage({
				packageId: staged.packageId,
				projectRoot,
				apply: true,
				sandboxReady: true,
			});
			expect(loaded.blocked).toBe(false);
			const settings = JSON.parse(
				await readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			);
			expect(settings.packages[0].extensions).toEqual([
				"+extensions/policy.ts",
			]);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});
});

describe("Olympus manifest-backed uninstall", () => {
	test("dry-runs and applies manifest-authorized uninstall", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-uninstall-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			const plan = await planManifestUninstall({
				packageId: install.packageId,
				projectRoot,
				apply: false,
			});
			expect(plan.blocked).toBe(false);
			expect(plan.wouldRemove).toContain(".pi/settings.json packages entry");
			const apply = await applyManifestUninstall({
				packageId: install.packageId,
				projectRoot,
				apply: true,
			});
			expect(apply.preserved).toEqual([]);
			expect(apply.removed).toContain(".pi/settings.json packages entry");
			const settings = JSON.parse(
				await readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			);
			expect(settings.packages).toEqual([]);
			const manifest = JSON.parse(
				await readFile(
					path.join(projectRoot, ".pi", "olympus", "olympus-manifest.json"),
					"utf8",
				),
			);
			expect(manifest.packages).toEqual([]);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("preserves user-modified manifest files on uninstall", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-uninstall-preserve-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			const promptPath = path.join(
				projectRoot,
				".pi",
				"olympus",
				"packages",
				install.packageId,
				"package",
				"prompts",
				"review.md",
			);
			await writeFile(promptPath, "changed by user\n");
			const report = await applyManifestUninstall({
				packageId: install.packageId,
				projectRoot,
				apply: true,
			});
			expect(
				report.preserved.some((filePath) =>
					filePath.endsWith("prompts/review.md"),
				),
			).toBe(true);
			expect(await readFile(promptPath, "utf8")).toBe("changed by user\n");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("CLI install and uninstall apply run inside explicit project cwd", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-cli-install-"),
		);
		try {
			const installProc = Bun.spawn(
				[
					"bun",
					CLI,
					"install",
					fixturePath("passive-package"),
					"--project",
					"--apply",
					"--json",
				],
				{ cwd: projectRoot },
			);
			const [installStdout, installExit] = await Promise.all([
				new Response(installProc.stdout).text(),
				installProc.exited,
			]);
			expect(installExit).toBe(0);
			const installReport = JSON.parse(installStdout);
			expect(installReport.blocked).toBe(false);
			const uninstallProc = Bun.spawn(
				[
					"bun",
					CLI,
					"uninstall",
					installReport.packageId,
					"--project",
					"--apply",
					"--json",
				],
				{ cwd: projectRoot },
			);
			const [uninstallStdout, uninstallExit] = await Promise.all([
				new Response(uninstallProc.stdout).text(),
				uninstallProc.exited,
			]);
			expect(uninstallExit).toBe(0);
			expect(JSON.parse(uninstallStdout).removed).toContain(
				".pi/settings.json packages entry",
			);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("CLI executable stage writes no settings load entry", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-cli-executable-stage-"),
		);
		try {
			const dryRunProc = Bun.spawn(
				[
					"bun",
					CLI,
					"install",
					fixturePath("mixed-package"),
					"--project",
					"--executable",
					"--json",
				],
				{ cwd: projectRoot },
			);
			const [dryRunStdout, dryRunExit] = await Promise.all([
				new Response(dryRunProc.stdout).text(),
				dryRunProc.exited,
			]);
			expect(dryRunExit).toBe(0);
			const dryRun = JSON.parse(dryRunStdout);
			const applyProc = Bun.spawn(
				[
					"bun",
					CLI,
					"install",
					fixturePath("mixed-package"),
					"--project",
					"--executable",
					"--signature-digest",
					dryRun.signatureSubjectDigest,
					"--apply",
					"--json",
				],
				{ cwd: projectRoot },
			);
			const [applyStdout, applyExit] = await Promise.all([
				new Response(applyProc.stdout).text(),
				applyProc.exited,
			]);
			expect(applyExit).toBe(0);
			expect(JSON.parse(applyStdout).written).toContain(
				".pi/olympus/olympus.lock",
			);
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});
});
