import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { uninstallManagedFiles } from "@openagentlayer/install";
import {
	createInstalledCodexFixture,
	writeManagedNeighbor,
} from "../_helpers/install";

describe("OAL installer managed-file uninstall", () => {
	test("uninstall removes only managed files", async () => {
		const { targetRoot } = await createInstalledCodexFixture();
		const neighborPath = await writeManagedNeighbor(targetRoot);

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.removedFiles).toContain(
			join(targetRoot, ".oal/manifest/codex-project.json"),
		);
		expect(await Bun.file(neighborPath).text()).toBe("keep\n");
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
	});
});
