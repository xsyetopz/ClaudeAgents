import { describe, expect, test } from "bun:test";
import { uninstallManagedFiles } from "@openagentlayer/install";
import { writeForgedManifestFixture } from "../_helpers/install";

describe("OAL installer forged-manifest uninstall", () => {
	test("uninstall ignores forged manifest target root", async () => {
		const { externalVictim, localManagedFile, targetRoot } =
			await writeForgedManifestFixture();

		await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(await Bun.file(externalVictim).text()).toBe("external\n");
		expect(await Bun.file(localManagedFile).exists()).toBe(false);
	});
});
