import { describe, expect, test } from "bun:test";

describe("OAL public entrypoint boundaries", () => {
	test("keeps installer public entrypoint as module barrel", async () => {
		const index = await Bun.file("packages/install/src/index.ts").text();
		expect(index.split("\n").length).toBeLessThanOrEqual(40);
		expect(index).not.toContain("function parseStructuredContent");
		expect(index).not.toContain("function uninstallManagedEntry");
		expect(index).not.toContain("function verifyHookScript");
		expect(index).not.toContain("function mergeArtifactContent");
	});

	test("keeps runtime public entrypoint as module barrel", async () => {
		const index = await Bun.file("packages/runtime/src/index.ts").text();
		expect(index.split("\n").length).toBeLessThanOrEqual(40);
		expect(index).not.toContain("function evaluateCompletionGate");
		expect(index).not.toContain("function evaluateRuntimePolicy");
		expect(index).not.toContain("function evaluateSourceDriftGuard");
		expect(index).not.toContain("function renderRuntimeScript");
	});

	test("keeps shared adapter entrypoint as barrel", async () => {
		const index = await Bun.file(
			"packages/adapters/src/shared/index.ts",
		).text();
		expect(index.split("\n").length).toBeLessThanOrEqual(20);
		expect(index).not.toContain("function ");
		expect(index).not.toContain("interface ");
		expect(index).toContain("export {");
	});

	test("keeps types, render, contract, and diagnostics entrypoints focused", async () => {
		const typeIndex = await Bun.file("packages/types/src/types.ts").text();
		const renderIndex = await Bun.file("packages/render/src/index.ts").text();
		const contractIndex = await Bun.file(
			"packages/adapter-contract/src/index.ts",
		).text();
		const diagnostics = await Bun.file(
			"packages/diagnostics/src/diagnostics.ts",
		).text();

		expect(typeIndex.split("\n").length).toBeLessThanOrEqual(40);
		expect(typeIndex).not.toContain("interface ");
		expect(typeIndex).toContain("export type {");
		expect(renderIndex.split("\n").length).toBeLessThanOrEqual(40);
		expect(renderIndex).not.toContain("function ");
		expect(contractIndex.split("\n").length).toBeLessThanOrEqual(40);
		expect(contractIndex).not.toContain("interface ");
		expect(contractIndex).not.toContain("function ");
		expect(diagnostics.split("\n").length).toBeLessThanOrEqual(20);
		expect(diagnostics).not.toContain("function ");
		expect(diagnostics).toContain("hasErrors");
	});
});
