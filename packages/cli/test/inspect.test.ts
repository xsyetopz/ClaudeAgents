import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { evaluateLocalPackage, inspectLocalPackage } from "lifecycle";

const FIXTURES = path.join(import.meta.dir, "fixtures");

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

describe("Olympi package inspection", () => {
	test("discovers passive resources from pi manifest and conventional directories", async () => {
		const report = await inspectLocalPackage(fixturePath("passive-package"));
		expect(report.schemaVersion).toBe(1);
		expect(report.package.name).toBe("passive-package");
		expect(report.piManifest.present).toBe(true);
		expect(report.resources.map((resource) => resource.id)).toEqual([
			"prompt:review",
			"skill:reviewer",
			"theme:dark",
		]);
		expect(report.resources.every((resource) => resource.passive)).toBe(true);
		expect(report.executables).toEqual([]);
		const skill = report.resources.find(
			(resource) => resource.id === "skill:reviewer",
		);
		expect(skill?.supportFiles.map((supportFile) => supportFile.path)).toEqual([
			"skills/reviewer/references/checklist.md",
		]);
	});

	test("classifies extensions and support scripts as executable without running them", async () => {
		const mixed = await inspectLocalPackage(fixturePath("mixed-package"));
		expect(
			mixed.executables.some(
				(executable) => executable.id === "extension:policy",
			),
		).toBe(true);
		expect(
			mixed.resources.find((resource) => resource.id === "extension:policy")
				?.executable,
		).toBe(true);

		const support = await inspectLocalPackage(
			fixturePath("support-files-package"),
		);
		expect(
			support.resources[0]?.supportFiles.map((supportFile) => supportFile.path),
		).toEqual([
			"skills/deep/assets/example.txt",
			"skills/deep/references/ref.md",
			"skills/deep/scripts/helper.sh",
		]);
		expect(
			support.executables.some(
				(executable) =>
					executable.id === "support-script:skills/deep/scripts/helper.sh",
			),
		).toBe(true);
	});

	test("reports lifecycle package scripts as executable inventory", async () => {
		const report = await inspectLocalPackage(
			fixturePath("lifecycle-script-package"),
		);
		expect(report.scripts.map((script) => script.name)).toEqual([
			"postinstall",
			"test",
		]);
		expect(
			report.scripts.find((script) => script.name === "postinstall")?.lifecycle,
		).toBe(true);
		expect(report.executables.map((executable) => executable.id)).toContain(
			"script:postinstall",
		);
	});

	test("keeps malformed passive files inspectable while reporting warnings", async () => {
		const report = await inspectLocalPackage(fixturePath("malformed-package"));
		expect(report.resources.map((resource) => resource.id)).toEqual([
			"theme:bad",
		]);
		expect(
			report.warnings.some((warning) => warning.includes("invalid theme JSON")),
		).toBe(true);
	});

	test("reports resource identity collisions", async () => {
		const report = await inspectLocalPackage(fixturePath("collision-package"));
		expect(report.resources.map((resource) => resource.id)).toContain(
			"prompt:review",
		);
		expect(report.warnings).toContain(
			"resource identity collision: prompt:review",
		);
	});

	test("evaluates passive packages without recommending executable trust", async () => {
		const passive = await evaluateLocalPackage(fixturePath("passive-package"));
		expect(passive.decision).toBe("trust-passive");
		const mixed = await evaluateLocalPackage(fixturePath("mixed-package"));
		expect(mixed.decision).toBe("inspect-more");
		expect(mixed.inspection.executables.length).toBeGreaterThan(0);
	});
});

describe("Olympi CLI", () => {
	test("emits JSON inspection reports", async () => {
		const proc = Bun.spawn([
			"bun",
			path.join(import.meta.dir, "..", "src", "cli.ts"),
			"package",
			"inspect",
			fixturePath("passive-package"),
			"--json",
		]);
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);
		expect(JSON.parse(stdout).package.name).toBe("passive-package");
	});

	test("plans passive install without writing fake home or project state", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-cli-test-"));
		try {
			const marker = path.join(tempRoot, "fake-home", ".pi", "marker.json");
			const proc = Bun.spawn(
				[
					"bun",
					path.join(import.meta.dir, "..", "src", "cli.ts"),
					"install",
					fixturePath("passive-package"),
					"--project",
					"--dry-run",
					"--json",
				],
				{
					cwd: tempRoot,
					env: { ...process.env, HOME: path.join(tempRoot, "fake-home") },
				},
			);
			const [stdout, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			const report = JSON.parse(stdout);
			expect(exitCode).toBe(0);
			expect(report.blocked).toBe(false);
			expect(report.wouldWrite).toContain(".pi/settings.json packages entry");
			await expect(readFile(marker, "utf8")).rejects.toThrow();
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
			await writeFile(path.join(tempRoot, "assert-temp-root-used"), "ok\n");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("runs the bounded verify command", async () => {
		const proc = Bun.spawn([
			"bun",
			path.join(import.meta.dir, "..", "src", "cli.ts"),
			"verify",
			"--json",
		]);
		const [stdout, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			proc.exited,
		]);
		expect(exitCode).toBe(0);
		expect(JSON.parse(stdout).ok).toBe(true);
	});
});
