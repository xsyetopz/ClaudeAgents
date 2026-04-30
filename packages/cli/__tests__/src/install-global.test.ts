import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	createInstallTarget,
	manifestExists,
	runInstall,
} from "../_helpers/install-flow";

describe("OAL CLI global install flows", () => {
	test("global install requires explicit target", async () => {
		const result = await runInstall({
			scope: "global",
			surface: "codex",
		});

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain(
			"Global install requires explicit --target",
		);
	});

	test("global install writes selected surface artifacts and manifest", async () => {
		const targetRoot = await createInstallTarget();

		const result = await runInstall({
			scope: "global",
			surface: "codex",
			target: targetRoot,
		});

		expect(result.exitCode).toBe(0);
		expect(await manifestExists(targetRoot, "codex", "global")).toBe(true);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(true);
	});
});
