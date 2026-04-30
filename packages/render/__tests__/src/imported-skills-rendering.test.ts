import { describe, expect, test } from "bun:test";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL imported skill rendering", () => {
	test("renders Caveman and Taste families as complete native skill packages", async () => {
		const codex = await renderSurfaceBundle("codex");
		const claude = await renderSurfaceBundle("claude");
		const opencode = await renderSurfaceBundle("opencode");

		expect(artifactPaths(codex)).toEqual(
			expect.arrayContaining([
				".codex/openagentlayer/plugin/skills/caveman/SKILL.md",
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
				".codex/openagentlayer/plugin/skills/taste-imagegen/openai.yaml",
			]),
		);
		expect(artifactPaths(claude)).toEqual(
			expect.arrayContaining([
				".claude/skills/caveman/SKILL.md",
				".claude/skills/taste/SKILL.md",
				".claude/skills/taste-imagegen/openai.yaml",
			]),
		);
		expect(artifactPaths(opencode)).toEqual(
			expect.arrayContaining([
				".opencode/skills/caveman/SKILL.md",
				".opencode/skills/taste/SKILL.md",
				".opencode/skills/taste-imagegen/openai.yaml",
			]),
		);

		for (const bundle of [codex, claude, opencode]) {
			expect(
				artifactPaths(bundle).some((path) => path.includes("full-skill")),
			).toBe(false);
		}
		expect(
			artifactContent(
				codex,
				".codex/openagentlayer/plugin/skills/caveman/SKILL.md",
			),
		).toContain("Caveman changes assistant prose only");
		expect(
			artifactContent(
				codex,
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
			),
		).toContain("openagentlayerrontend Skill");
		expect(
			artifactContent(
				codex,
				".codex/openagentlayer/plugin/skills/taste/SKILL.md",
			),
		).toContain("openagentsbtw Taste Mapping");
	});
});
