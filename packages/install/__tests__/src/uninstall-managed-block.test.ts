import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	applyInstallPlan,
	uninstallManagedFiles,
} from "@openagentlayer/install";
import { createInstallFixture } from "../_helpers/install";

describe("OAL installer marked-block uninstall", () => {
	test("uninstall removes AGENTS.md managed block only", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		const agentsPath = join(targetRoot, "AGENTS.md");
		await writeFile(agentsPath, "# User Instructions\n\nKeep this.\n");

		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toEqual([]);
		expect(await Bun.file(agentsPath).text()).toBe(
			"# User Instructions\n\nKeep this.\n",
		);
	});
});
