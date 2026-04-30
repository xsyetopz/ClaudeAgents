import { describe, expect, test } from "bun:test";
import {
	codexProjectManifestExists,
	createBlockedCodexSourceRoot,
	createCodexConfigConflict,
	runProjectInstall,
} from "../_helpers/failure-flow";

describe("OAL CLI single-surface install failure atomicity", () => {
	test("install fails before writing when adapter diagnostics contain errors", async () => {
		const sourceRoot = await createBlockedCodexSourceRoot();
		const targetRoot = await createCodexConfigConflict();

		const result = await runProjectInstall({
			root: sourceRoot,
			surface: "codex",
			targetRoot,
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(await codexProjectManifestExists(targetRoot)).toBe(false);
	});

	test("install reports config conflicts without partial writes", async () => {
		const targetRoot = await createCodexConfigConflict();

		const result = await runProjectInstall({
			root: process.cwd(),
			surface: "codex",
			targetRoot,
		});

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("config-conflict");
		expect(await codexProjectManifestExists(targetRoot)).toBe(false);
	});
});
