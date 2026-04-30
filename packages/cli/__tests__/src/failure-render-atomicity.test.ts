import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { runCli } from "../_helpers/cli";
import { createBlockedOpencodeSourceRoot } from "../_helpers/failure-flow";

describe("OAL CLI render failure atomicity", () => {
	test("render fails before writing when adapter diagnostics contain errors", async () => {
		const sourceRoot = await createBlockedOpencodeSourceRoot();
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"render",
			"--out",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			false,
		);
	});
});
