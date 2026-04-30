import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	createInstallTarget,
	manifestExists,
	runInstall,
	runUninstall,
} from "../_helpers/install-flow";

describe("OAL CLI uninstall edited-content flows", () => {
	test("uninstall reports edited managed config and keeps manifest", async () => {
		const targetRoot = await createInstallTarget();
		const installResult = await runInstall({
			scope: "project",
			surface: "codex",
			target: targetRoot,
		});
		expect(installResult.exitCode).toBe(0);
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const uninstallResult = await runUninstall({
			scope: "project",
			surface: "codex",
			target: targetRoot,
		});

		expect(uninstallResult.exitCode).toBe(1);
		expect(uninstallResult.stderr).toContain("managed-content-changed");
		expect(await manifestExists(targetRoot, "codex", "project")).toBe(true);
	});
});
