import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createExtensionSkeleton, inspectExtensionPath } from "extensions";
import { evaluateLocalPackage } from "lifecycle";

const FIXTURES = path.join(import.meta.dir, "fixtures");
const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

describe("Olympi extension authoring", () => {
	test("plans generated first-party extension skeletons without writing by default", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-extension-plan-"),
		);
		try {
			const report = await createExtensionSkeleton({
				name: "status-panel",
				outputDirectory: tempRoot,
				apply: false,
			});
			expect(report.apply).toBe(false);
			expect(report.blocked).toBe(false);
			expect(report.wouldWrite).toContain(
				path.join(tempRoot, "status-panel", "olympi-extension.json"),
			);
			await expect(
				readFile(path.join(tempRoot, "status-panel", "package.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("generates and inspects Olympi-owned extension skeletons with explicit apply/output", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-extension-create-"),
		);
		try {
			const createReport = await createExtensionSkeleton({
				name: "trust-panel",
				outputDirectory: tempRoot,
				apply: true,
			});
			expect(createReport.written).toContain(
				path.join(tempRoot, "trust-panel", "src", "index.ts"),
			);
			const inspectReport = await inspectExtensionPath(
				path.join(tempRoot, "trust-panel"),
			);
			expect(inspectReport.manifest.valid).toBe(true);
			expect(inspectReport.manifest.data?.olympiOwned).toBe(true);
			expect(inspectReport.inferred.commands).toEqual(["/olympi-trust-panel"]);
			expect(inspectReport.warnings).toEqual([]);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("CLI create apply requires explicit output and writes no default project Pi state", async () => {
		const proc = Bun.spawn(
			["bun", CLI, "extension", "create", "blocked-panel", "--apply", "--json"],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		expect(exitCode).toBe(3);
		expect(`${stdout}${stderr}`).toContain("requires --output");
		await expect(
			readFile(
				path.join(
					process.cwd(),
					".pi",
					"olympi",
					"extensions",
					"blocked-panel",
					"package.json",
				),
				"utf8",
			),
		).rejects.toThrow();
	});
});

describe("Olympi third-party package evaluator", () => {
	test("reports extension command, tool, provider, and event risks without execution", async () => {
		const report = await evaluateLocalPackage(
			fixturePath("extension-conflict-package"),
		);
		expect(report.decision).toBe("inspect-more");
		expect(report.conflicts).toContain(
			"extension command collision: /review in extensions/alpha.ts and extensions/beta.ts",
		);
		expect(report.conflicts).toContain(
			"tool override risk: bash in extensions/alpha.ts",
		);
		expect(report.conflicts).toContain(
			"extension provider registration: danger-provider in extensions/beta.ts",
		);
		expect(report.conflicts).toContain(
			"extension event subscription: tool_call in extensions/alpha.ts",
		);
	});

	test("CLI extension inspect validates generated metadata", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-extension-cli-"),
		);
		try {
			await createExtensionSkeleton({
				name: "cli-panel",
				outputDirectory: tempRoot,
				apply: true,
			});
			const proc = Bun.spawn([
				"bun",
				CLI,
				"extension",
				"inspect",
				path.join(tempRoot, "cli-panel"),
				"--json",
			]);
			const [stdout, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			expect(exitCode).toBe(0);
			const report = JSON.parse(stdout);
			expect(report.manifest.valid).toBe(true);
			expect(report.inferred.commands).toEqual(["/olympi-cli-panel"]);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
