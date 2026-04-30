import { describe, expect, test } from "bun:test";
import { createFixtureRoot } from "@openagentlayer/testkit";
import {
	codexConfigExists,
	codexProjectManifestExists,
	createBlockedOpencodeSourceRoot,
	createClaudeSettingsConflict,
	runProjectInstall,
} from "../_helpers/failure-flow";

describe("OAL CLI all-surface install failure atomicity", () => {
	test("surface all install fails atomically when one adapter has diagnostics", async () => {
		const sourceRoot = await createBlockedOpencodeSourceRoot();
		const targetRoot = await createFixtureRoot();

		const result = await runProjectInstall({
			root: sourceRoot,
			surface: "all",
			targetRoot,
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(await codexProjectManifestExists(targetRoot)).toBe(false);
		expect(await codexConfigExists(targetRoot)).toBe(false);
	});

	test("surface all install preflights config conflicts before writing", async () => {
		const targetRoot = await createClaudeSettingsConflict();

		const result = await runProjectInstall({
			root: process.cwd(),
			surface: "all",
			targetRoot,
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("config-conflict");
		expect(await codexProjectManifestExists(targetRoot)).toBe(false);
		expect(await codexConfigExists(targetRoot)).toBe(false);
	});
});
