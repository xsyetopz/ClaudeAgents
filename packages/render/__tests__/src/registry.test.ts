import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";

describe("OAL adapter registry", () => {
	test("registers required surfaces deterministically", () => {
		const registry = createAdapterRegistry();

		expect(registry.adapters.map((adapter) => adapter.surface)).toEqual([
			"claude-code",
			"codex",
			"opencode",
		]);
	});

	test("renders Codex bundle with native artifacts", async () => {
		const sourceResult = await loadSourceGraph(process.cwd());
		if (sourceResult.graph === undefined) {
			throw new Error("Expected graph.");
		}

		const registry = createAdapterRegistry();
		const bundle = registry.renderSurfaceBundle(sourceResult.graph, "codex");

		expect(bundle.surface).toBe("codex");
		expect(
			bundle.artifacts.map(
				(artifact: { readonly path: string }) => artifact.path,
			),
		).toEqual(
			expect.arrayContaining([
				".codex/openagentlayer/agents/athena.md",
				".codex/openagentlayer/agents/hephaestus.md",
				".codex/openagentlayer/config.toml",
				".codex/openagentlayer/guidance/core.md",
				".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
				".codex/openagentlayer/plugin/skills/command-plan/SKILL.md",
				".codex/openagentlayer/plugin/skills/review-policy/SKILL.md",
				".codex/openagentlayer/policies/completion-gate.json",
				".codex/openagentlayer/policies/destructive-command-guard.json",
				".codex/openagentlayer/runtime/completion-gate.mjs",
				".codex/openagentlayer/runtime/destructive-command-guard.mjs",
			]),
		);
		expect(bundle.diagnostics).toEqual([]);
		const codexConfig = bundle.artifacts.find(
			(artifact) => artifact.path === ".codex/openagentlayer/config.toml",
		)?.content;
		expect(codexConfig).toContain("fast_mode = false");
		expect(codexConfig).toContain("multi_agent_v2 = true");
		expect(codexConfig).toContain("unified_exec = false");
		expect(codexConfig).toContain("[profiles.codex-plus]");
		expect(codexConfig).toContain("[profiles.codex-pro-5]");
		expect(codexConfig).toContain("[[hooks.Stop]]");
		expect(codexConfig).toContain("[[hooks.PreToolUse]]");
		expect(codexConfig).toContain(
			'command = "bun .codex/openagentlayer/runtime/completion-gate.mjs"',
		);
		expect(() => Bun.TOML.parse(codexConfig ?? "")).not.toThrow();
		const codexPlusAthena = bundle.artifacts.find(
			(artifact) => artifact.path === ".codex/openagentlayer/agents/athena.md",
		)?.content;
		const codexProAthena = registry
			.renderSurfaceBundle(sourceResult.graph, "codex", {
				modelPlanId: "codex-pro-5",
			})
			.artifacts.find(
				(artifact) =>
					artifact.path === ".codex/openagentlayer/agents/athena.md",
			)?.content;
		expect(codexPlusAthena).toContain('model: "gpt-5.4"');
		expect(codexProAthena).toContain('model: "gpt-5.5"');
		expect(
			registry.renderSurfaceBundle(sourceResult.graph, "codex", {
				modelPlanId: "missing-plan",
			}).diagnostics,
		).toContainEqual(
			expect.objectContaining({
				code: "unknown-model-plan",
				level: "error",
			}),
		);
	});

	test("renders Claude and OpenCode native artifacts", async () => {
		const sourceResult = await loadSourceGraph(process.cwd());
		if (sourceResult.graph === undefined) {
			throw new Error("Expected graph.");
		}

		const registry = createAdapterRegistry();
		const claudeBundle = registry.renderSurfaceBundle(
			sourceResult.graph,
			"claude-code",
		);
		const openCodeBundle = registry.renderSurfaceBundle(
			sourceResult.graph,
			"opencode",
		);

		expect(
			claudeBundle.artifacts.map(
				(artifact: { readonly path: string }) => artifact.path,
			),
		).toContain(".claude/agents/athena.md");
		expect(
			claudeBundle.artifacts.map(
				(artifact: { readonly path: string }) => artifact.path,
			),
		).toContain(".claude/settings.json");
		expect(
			claudeBundle.artifacts.find(
				(artifact) => artifact.path === ".claude/settings.json",
			)?.content,
		).toContain("bun .claude/openagentlayer/runtime/completion-gate.mjs");
		expect(() =>
			JSON.parse(
				claudeBundle.artifacts.find(
					(artifact) => artifact.path === ".claude/settings.json",
				)?.content ?? "",
			),
		).not.toThrow();
		expect(
			openCodeBundle.artifacts.map(
				(artifact: { readonly path: string }) => artifact.path,
			),
		).toEqual(
			expect.arrayContaining([
				".opencode/agents/athena.md",
				".opencode/agents/hephaestus.md",
				".opencode/commands/plan.md",
				".opencode/openagentlayer/guidance/core.md",
				".opencode/openagentlayer/policies/completion-gate.json",
				".opencode/openagentlayer/policies/destructive-command-guard.json",
				".opencode/openagentlayer/runtime/completion-gate.mjs",
				".opencode/openagentlayer/runtime/destructive-command-guard.mjs",
				".opencode/plugins/openagentlayer.ts",
				".opencode/skills/review-policy/SKILL.md",
				"opencode.json",
			]),
		);
		expect(openCodeBundle.diagnostics).toEqual([]);
		expect(
			openCodeBundle.artifacts.find(
				(artifact) => artifact.path === ".opencode/plugins/openagentlayer.ts",
			)?.content,
		).toContain("destructive-command-guard");
		expect(
			openCodeBundle.artifacts.find(
				(artifact) => artifact.path === "opencode.json",
			)?.content,
		).toContain('"model": "gpt-5.4"');
		expect(() =>
			JSON.parse(
				openCodeBundle.artifacts.find(
					(artifact) => artifact.path === "opencode.json",
				)?.content ?? "",
			),
		).not.toThrow();
	});
});
