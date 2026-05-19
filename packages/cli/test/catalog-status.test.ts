import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPassiveInstall, readProjectStatus } from "lifecycle";
import {
	formatOlympiCatalog,
	getOlympiCatalog,
	validateOlympiCatalog,
} from "reporting";

const FIXTURES = path.join(import.meta.dir, "fixtures");
const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

describe("Olympi catalog", () => {
	test("defines Olympi contracts without legacy framing", () => {
		const catalog = getOlympiCatalog();
		expect(catalog.product).toBe("Olympi");
		expect(validateOlympiCatalog(catalog)).toEqual([]);
		expect(catalog.commands.map((command) => command.command)).toContain(
			"install",
		);
		expect(catalog.commands.map((command) => command.command)).toContain(
			"status",
		);
		expect(formatOlympiCatalog(catalog)).toContain("# Olympi Catalog");
		expect(JSON.stringify(catalog).toLowerCase()).not.toContain(
			"openagentlayer",
		);
		expect(JSON.stringify(catalog).toLowerCase()).not.toContain("oal vnext");
	});

	test("CLI emits catalog JSON and Markdown", async () => {
		const jsonProc = Bun.spawn(["bun", CLI, "catalog", "--json"]);
		const [jsonStdout, jsonExit] = await Promise.all([
			new Response(jsonProc.stdout).text(),
			jsonProc.exited,
		]);
		expect(jsonExit).toBe(0);
		expect(JSON.parse(jsonStdout).valid).toBe(true);
		const markdownProc = Bun.spawn(["bun", CLI, "catalog"]);
		const [markdownStdout, markdownExit] = await Promise.all([
			new Response(markdownProc.stdout).text(),
			markdownProc.exited,
		]);
		expect(markdownExit).toBe(0);
		expect(markdownStdout).toContain("## Command contracts");
	});
});

describe("Olympi project status", () => {
	test("reports empty project state without mutating it", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-status-empty-"),
		);
		try {
			const status = await readProjectStatus(projectRoot);
			expect(status.manifestPackages).toBe(0);
			expect(status.auditEvents).toBe(0);
			expect(status.warnings).toEqual([]);
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("reports manifest-owned installed package state", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-status-install-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			const status = await readProjectStatus(projectRoot);
			expect(status.manifestPackages).toBe(1);
			expect(status.auditEvents).toBe(1);
			expect(status.warnings).toEqual([]);
			expect(status.packages[0]?.packageId).toBe(install.packageId);
			expect(status.packages[0]?.settingsEntryHashMatches).toBe(true);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("reports changed manifest-owned files for handoff", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-status-drift-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			await writeFile(
				path.join(
					projectRoot,
					".pi",
					"olympi",
					"packages",
					install.packageId,
					"package",
					"prompts",
					"review.md",
				),
				"changed\n",
			);
			const status = await readProjectStatus(projectRoot);
			expect(
				status.warnings.some((warning) => warning.includes("hash mismatch")),
			).toBe(true);
			expect(
				status.packages[0]?.fileHashMismatches.some((filePath) =>
					filePath.endsWith("prompts/review.md"),
				),
			).toBe(true);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("CLI status exits nonzero when drift is visible", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-status-cli-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot,
				apply: true,
			});
			await writeFile(
				path.join(
					projectRoot,
					".pi",
					"olympi",
					"packages",
					install.packageId,
					"package",
					"themes",
					"dark.json",
				),
				'{"changed":true}\n',
			);
			const proc = Bun.spawn(["bun", CLI, "status", "--json"], {
				cwd: projectRoot,
			});
			const [stdout, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			expect(exitCode).toBe(1);
			expect(JSON.parse(stdout).warnings[0]).toContain("hash mismatch");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});
});
