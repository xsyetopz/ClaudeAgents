import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeSkill,
} from "@openagentlayer/testkit";
import { artifactContent, artifactPaths } from "../_helpers/registry";

describe("OAL Codex skill bundle rendering", () => {
	test("renders complete native skill packages from fixture source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, {
			id: "fixture-skill",
			invocationMode: "manual-only",
			supportFile: "references/guide.md",
			userInvocable: false,
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}
		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"codex",
		);

		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/fixture-skill/SKILL.md",
		);
		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/fixture-skill/references/guide.md",
		);
		expect(artifactPaths(bundle)).toContain(
			".codex/openagentlayer/plugin/skills/fixture-skill/agents/openai.yaml",
		);
		expect(
			artifactContent(
				bundle,
				".codex/openagentlayer/plugin/skills/fixture-skill/SKILL.md",
			),
		).toContain('name: "fixture-skill"');
	});
});
