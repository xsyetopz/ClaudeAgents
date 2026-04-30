import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { listFiles } from "../_helpers/package-boundaries";

describe("OAL split ownership boundaries", () => {
	test("keeps adapter provider indexes as small factories", async () => {
		for (const provider of ["claude", "codex", "opencode"]) {
			const index = await Bun.file(
				`packages/adapters/src/providers/${provider}/index.ts`,
			).text();
			expect(index.split("\n").length).toBeLessThanOrEqual(40);
			expect(index).not.toContain("renderRuntimeScript");
			expect(index).not.toContain("validateConfigObject");
			expect(index).not.toContain("renderMarkdownWithFrontmatter");
		}
	});

	test("keeps adapter providers isolated from each other", async () => {
		const providerFiles = (await listFiles("packages/adapters/src/providers"))
			.filter((path) => path.endsWith(".ts"))
			.filter((path) => !path.endsWith("index.ts"));
		const violations: string[] = [];
		for (const path of providerFiles) {
			const provider = path.split("/")[4];
			const content = await readFile(path, "utf8");
			for (const otherProvider of ["claude", "codex", "opencode"]) {
				if (
					otherProvider !== provider &&
					content.includes(`providers/${otherProvider}`)
				) {
					violations.push(`${path} -> ${otherProvider}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	test("keeps source loader and validator split by ownership", async () => {
		const load = await Bun.file("packages/source/src/load.ts").text();
		const validate = await Bun.file("packages/source/src/validate.ts").text();

		expect(load.split("\n").length).toBeLessThanOrEqual(120);
		expect(load).not.toContain("function parseToml");
		expect(load).not.toContain("function buildGraph");
		expect(validate.split("\n").length).toBeLessThanOrEqual(40);
		expect(validate).not.toContain("function validateModelPlan");
		expect(validate).not.toContain("function validateSurfaceConfig");
		expect(validate).not.toContain("function validateRouteContract");
	});

	test("keeps render registry and write plan split by ownership", async () => {
		const registry = await Bun.file("packages/render/src/registry.ts").text();
		const writePlan = await Bun.file(
			"packages/render/src/write-plan.ts",
		).text();

		expect(registry.split("\n").length).toBeLessThanOrEqual(90);
		expect(registry).not.toContain("function validateModelPlanOption");
		expect(registry).not.toContain("function normalizeBundle");
		expect(writePlan.split("\n").length).toBeLessThanOrEqual(90);
		expect(writePlan).not.toContain("function createDesiredFiles");
		expect(writePlan).not.toContain("function stableJson");
		expect(writePlan).not.toContain("async function listExistingFiles");
	});
});
