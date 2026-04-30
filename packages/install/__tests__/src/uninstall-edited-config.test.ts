import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { uninstallManagedFiles } from "@openagentlayer/install";
import {
	createInstalledCodexFixture,
	readManifestEntryPaths,
} from "../_helpers/install";

describe("OAL installer edited-config uninstall", () => {
	test("uninstall preserves user-edited managed config values", async () => {
		const { targetRoot } = await createInstalledCodexFixture();
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "managed-content-changed" }),
		);
		expect(await Bun.file(join(targetRoot, ".codex/config.toml")).text()).toBe(
			"[features]\nfast_mode = true\n",
		);
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");
		expect(await Bun.file(manifestPath).exists()).toBe(true);
		expect(await readManifestEntryPaths(manifestPath)).toContain(
			".codex/config.toml",
		);
	});
});
