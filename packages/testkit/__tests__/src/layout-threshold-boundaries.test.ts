import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
	countLines,
	isPackageCodeFile,
	listFiles,
	MAX_BOUNDARY_SCENARIO_LINES,
	MAX_PACKAGE_CODE_LINES,
	MAX_RENDER_REGISTRY_SCENARIO_LINES,
	MAX_RUNTIME_SCENARIO_LINES,
	PACKAGE_SRC_TEST_PATTERN,
} from "../_helpers/package-boundaries";

describe("OAL layout and threshold boundaries", () => {
	test("keeps package tests outside src directories", async () => {
		const testPaths = await listFiles("packages");
		expect(
			testPaths
				.filter((path) => path.endsWith(".test.ts"))
				.filter((path) => PACKAGE_SRC_TEST_PATTERN.test(path)),
		).toEqual([]);
	});

	test("keeps package code and test files below split threshold", async () => {
		const files = (await listFiles("packages")).filter(isPackageCodeFile);
		const oversizedFiles: string[] = [];
		for (const path of files) {
			const lineCount = countLines(await readFile(path, "utf8"));
			if (lineCount > MAX_PACKAGE_CODE_LINES) {
				oversizedFiles.push(`${path}: ${lineCount}`);
			}
		}
		expect(oversizedFiles).toEqual([]);
	});

	test("keeps CLI binary entrypoint thin", async () => {
		const entrypoint = await Bun.file("packages/cli/src/cli.ts").text();
		expect(entrypoint.split("\n").length).toBeLessThanOrEqual(40);
		expect(entrypoint).not.toContain("async function checkCommand");
		expect(entrypoint).not.toContain("function parseOptions");
		expect(entrypoint).not.toContain("function printDiagnostics");
		expect(entrypoint).not.toContain("function verifyRenderedHooks");
	});

	test("keeps package boundary scenarios split", async () => {
		const files = (await listFiles("packages/testkit/__tests__/src"))
			.filter((path) => path.endsWith(".test.ts"))
			.filter((path) => path.includes("boundaries"));
		const oversizedFiles: string[] = [];
		for (const path of files) {
			const lineCount = countLines(await readFile(path, "utf8"));
			if (lineCount > MAX_BOUNDARY_SCENARIO_LINES) {
				oversizedFiles.push(`${path}: ${lineCount}`);
			}
		}
		expect(files).not.toContain(
			"packages/testkit/__tests__/src/package-boundaries.test.ts",
		);
		expect(oversizedFiles).toEqual([]);
	});

	test("keeps runtime scenarios split", async () => {
		const files = (await listFiles("packages/runtime/__tests__/src")).filter(
			(path) => path.endsWith(".test.ts"),
		);
		const oversizedFiles: string[] = [];
		for (const path of files) {
			const lineCount = countLines(await readFile(path, "utf8"));
			if (lineCount > MAX_RUNTIME_SCENARIO_LINES) {
				oversizedFiles.push(`${path}: ${lineCount}`);
			}
		}
		expect(files).not.toContain(
			"packages/runtime/__tests__/src/runtime.test.ts",
		);
		expect(oversizedFiles).toEqual([]);
	});

	test("keeps render registry scenarios split", async () => {
		const files = (await listFiles("packages/render/__tests__/src"))
			.filter((path) => path.endsWith(".test.ts"))
			.filter(
				(path) =>
					path.endsWith("bundle.test.ts") ||
					path.endsWith("registry-order.test.ts"),
			);
		const oversizedFiles: string[] = [];
		for (const path of files) {
			const lineCount = countLines(await readFile(path, "utf8"));
			if (lineCount > MAX_RENDER_REGISTRY_SCENARIO_LINES) {
				oversizedFiles.push(`${path}: ${lineCount}`);
			}
		}
		expect(files).not.toContain(
			"packages/render/__tests__/src/registry.test.ts",
		);
		expect(oversizedFiles).toEqual([]);
	});
});
