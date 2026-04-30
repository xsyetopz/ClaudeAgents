import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import {
	artifactContent,
	artifactPaths,
	loadFixtureGraph,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL Codex bundle rendering", () => {
	test("renders native artifacts", async () => {
		const bundle = await renderSurfaceBundle("codex");

		expect(bundle.surface).toBe("codex");
		expect(artifactPaths(bundle)).toEqual(
			expect.arrayContaining([
				".codex/agents/athena.toml",
				".codex/agents/hephaestus.toml",
				".codex/config.toml",
				".codex/openagentlayer/guidance/core.md",
				".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
				".codex/openagentlayer/plugin/skills/command-plan/SKILL.md",
				".codex/openagentlayer/plugin/skills/review-policy/SKILL.md",
				".codex/openagentlayer/policies/completion-gate.json",
				".codex/openagentlayer/policies/destructive-command-guard.json",
				".codex/openagentlayer/policies/prompt-context-injection.json",
				".codex/openagentlayer/runtime/completion-gate.mjs",
				".codex/openagentlayer/runtime/destructive-command-guard.mjs",
				".codex/openagentlayer/runtime/prompt-context-injection.mjs",
				"AGENTS.md",
			]),
		);
		expect(bundle.diagnostics).toEqual([]);
	});

	test("renders config, plugin, and model-plan variants", async () => {
		const graph = await loadFixtureGraph();
		const registry = createAdapterRegistry();
		const bundle = registry.renderSurfaceBundle(graph, "codex");
		const codexConfig = artifactContent(bundle, ".codex/config.toml");
		const codexPlugin = artifactContent(
			bundle,
			".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
		);
		const codexPlusAthena = artifactContent(
			bundle,
			".codex/agents/athena.toml",
		);
		const codexProAthena = artifactContent(
			registry.renderSurfaceBundle(graph, "codex", {
				modelPlanId: "codex-pro-5",
			}),
			".codex/agents/athena.toml",
		);

		const parsedConfig = Bun.TOML.parse(codexConfig ?? "") as {
			readonly agents?: {
				readonly max_depth?: number;
				readonly max_threads?: number;
			};
			readonly features?: {
				readonly fast_mode?: boolean;
				readonly multi_agent?: boolean;
				readonly multi_agent_v2?: boolean;
				readonly unified_exec?: boolean;
			};
			readonly hooks?: Record<string, unknown[]>;
			readonly profiles?: Record<string, unknown>;
		};
		expect(parsedConfig.features).toMatchObject({
			fast_mode: false,
			multi_agent: false,
			multi_agent_v2: true,
			unified_exec: false,
		});
		expect(parsedConfig.agents).toMatchObject({
			max_depth: 1,
			max_threads: 6,
		});
		expect(Object.keys(parsedConfig.profiles ?? {})).toEqual(
			expect.arrayContaining(["codex-plus", "codex-pro-5"]),
		);
		expect(Object.keys(parsedConfig.hooks ?? {})).toEqual(
			expect.arrayContaining([
				"PermissionRequest",
				"PostToolUse",
				"PreToolUse",
				"Stop",
				"UserPromptSubmit",
			]),
		);
		expect(codexPlugin).toContain('"displayName": "OpenAgentLayer"');
		expect(codexPlugin).toContain('"name": "openagentlayer"');
		expect(codexPlusAthena).toContain('model = "gpt-5.4"');
		expect(codexPlusAthena).toContain('name = "athena"');
		expect(codexPlusAthena).toContain('developer_instructions = """');
		expect(codexPlusAthena).not.toContain("\\nOAL role");
		expect(() => Bun.TOML.parse(codexPlusAthena ?? "")).not.toThrow();
		expect(codexProAthena).toContain('model = "gpt-5.5"');
		expect(artifactContent(bundle, "AGENTS.md")).toContain(
			"OpenAgentLayer Codex Instructions",
		);
	});

	test("reports unknown model plan diagnostics", async () => {
		const bundle = await renderSurfaceBundle("codex", {
			modelPlanId: "missing-plan",
		});

		expect(bundle.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "unknown-model-plan",
				level: "error",
			}),
		);
	});
});
