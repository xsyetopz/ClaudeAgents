import { describe, expect, test } from "bun:test";
import { uninstallManagedFiles } from "@openagentlayer/install";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL installer missing-manifest uninstall", () => {
	test("uninstall missing manifest is no-op", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.removedFiles).toEqual([]);
	});
});
