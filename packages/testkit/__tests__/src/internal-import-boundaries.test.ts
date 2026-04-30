import { describe, expect, test } from "bun:test";
import { collectInternalPathViolations } from "../_helpers/package-boundaries";

describe("OAL internal import boundaries", () => {
	test("keeps package modules from importing CLI internals", async () => {
		const violations = await collectInternalPathViolations({
			internalPathParts: ["packages", "cli", "src"],
			excludedPackagePath: "packages/cli/",
		});
		expect(violations).toEqual([]);
	});

	test("keeps package modules from importing source, types, and render internals", async () => {
		expect(
			await collectInternalPathViolations({
				internalPathParts: ["packages", "source", "src"],
				excludedPackagePath: "packages/source/",
			}),
		).toEqual([]);
		expect(
			await collectInternalPathViolations({
				internalPathParts: ["packages", "types", "src"],
				excludedPackagePath: "packages/types/",
			}),
		).toEqual([]);
		expect(
			await collectInternalPathViolations({
				internalPathParts: ["packages", "render", "src"],
				excludedPackagePath: "packages/render/",
			}),
		).toEqual([]);
	});

	test("keeps package modules from importing contract and diagnostics internals", async () => {
		expect(
			await collectInternalPathViolations({
				internalPathParts: ["packages", "adapter-contract", "src"],
				excludedPackagePath: "packages/adapter-contract/",
			}),
		).toEqual([]);
		expect(
			await collectInternalPathViolations({
				internalPathParts: ["packages", "diagnostics", "src"],
				excludedPackagePath: "packages/diagnostics/",
			}),
		).toEqual([]);
	});
});
