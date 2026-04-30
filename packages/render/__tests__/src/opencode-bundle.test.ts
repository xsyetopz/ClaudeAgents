import { describe, expect, test } from "bun:test";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL OpenCode bundle rendering", () => {
	test("renders native artifacts, plugin, and config", async () => {
		const bundle = await renderSurfaceBundle("opencode");
		const plugin = artifactContent(
			bundle,
			".opencode/plugins/openagentlayer.ts",
		);
		const config = artifactContent(bundle, "opencode.json");

		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".opencode/agents/athena.md",
				".opencode/agents/hephaestus.md",
				".opencode/commands/plan.md",
				".opencode/openagentlayer/guidance/core.md",
				".opencode/openagentlayer/policies/completion-gate.json",
				".opencode/openagentlayer/policies/destructive-command-guard.json",
				".opencode/openagentlayer/policies/prompt-context-injection.json",
				".opencode/openagentlayer/runtime/completion-gate.mjs",
				".opencode/openagentlayer/runtime/destructive-command-guard.mjs",
				".opencode/openagentlayer/runtime/prompt-context-injection.mjs",
				".opencode/plugins/openagentlayer.ts",
				".opencode/skills/review-policy/SKILL.md",
				"opencode.json",
			]),
		);
		expect(bundle.diagnostics).toEqual([]);
		expect(plugin).toContain("destructive-command-guard");
		expect(plugin).toContain("tui.prompt.append");
		expect(plugin).toContain("OpenAgentLayerPlugin");
		expect(config).toContain('"model": "gpt-5.4"');
		expect(() => JSON.parse(config ?? "")).not.toThrow();
		for (const artifact of bundle.artifacts) {
			expect(artifact.content).not.toContain("openagentsbtw");
		}
	});
});
