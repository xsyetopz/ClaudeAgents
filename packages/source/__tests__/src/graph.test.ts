import { describe, expect, test } from "bun:test";
import { loadSourceGraph } from "@openagentlayer/source";
import { graphRecordKeys } from "@openagentlayer/testkit";

describe("OAL source graph", () => {
	test("loads valid seed source graph", async () => {
		const result = await loadSourceGraph(process.cwd());

		expect(result.diagnostics).toEqual([]);
		expect(
			result.graph === undefined ? [] : graphRecordKeys(result.graph),
		).toEqual(
			expect.arrayContaining([
				"agent:athena",
				"command:plan",
				"guidance:core",
				"model-plan:claude-max-20",
				"model-plan:claude-max-5",
				"model-plan:codex-plus",
				"model-plan:codex-pro-20",
				"model-plan:codex-pro-5",
				"policy:completion-gate",
				"policy:destructive-command-guard",
				"policy:prompt-context-injection",
				"surface-config:claude-surface-config",
				"surface-config:codex-surface-config",
				"surface-config:opencode-surface-config",
				"skill:review-policy",
			]),
		);
		expect(result.graph?.agents).toHaveLength(21);
		expect(result.graph?.modelPlans).toHaveLength(5);
		expect(result.graph?.surfaceConfigs).toHaveLength(3);
		expect(
			result.graph?.agents.find((record) => record.id === "athena")
				?.prompt_content,
		).toContain("# Athena");
		expect(result.graph?.skills[0]?.body_content).toContain("# Review Policy");
		expect(result.graph?.commands[0]?.prompt_template_content).toContain(
			"# Plan",
		);
	});
});
