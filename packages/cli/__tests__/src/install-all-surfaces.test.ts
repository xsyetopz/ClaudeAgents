import { describe, expect, test } from "bun:test";
import {
	createInstallTarget,
	manifestExists,
	runInstall,
	runUninstall,
} from "../_helpers/install-flow";

describe("OAL CLI all-surface install flows", () => {
	test("surface all project install and uninstall manage three manifests", async () => {
		const targetRoot = await createInstallTarget();

		const installResult = await runInstall({
			scope: "project",
			surface: "all",
			target: targetRoot,
		});

		expect(installResult.exitCode).toBe(0);
		for (const surface of ["codex", "claude", "opencode"] as const) {
			expect(await manifestExists(targetRoot, surface, "project")).toBe(true);
		}

		const uninstallResult = await runUninstall({
			includeRoot: true,
			scope: "project",
			surface: "all",
			target: targetRoot,
		});

		expect(uninstallResult.exitCode).toBe(0);
		for (const surface of ["codex", "claude", "opencode"] as const) {
			expect(await manifestExists(targetRoot, surface, "project")).toBe(false);
		}
	});
});
