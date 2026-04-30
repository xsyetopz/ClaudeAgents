import { describe, expect, test } from "bun:test";
import type { AgentRecord, SourceGraph } from "@openagentlayer/types";
import { renderPromptLayerBlock } from "../../src/shared/prompt-layers";

const agent = {
	description: "Planner",
	id: "athena",
	kind: "agent",
	location: {
		bodyPath: "prompt.md",
		directory: "source/agents/athena",
		metadataPath: "agent.toml",
	},
	mode: "both",
	permissions: ["read"],
	prompt: "prompt.md",
	prompt_content: "# Athena\n\nPlan work.",
	raw: {},
	role: "Athena",
	skills: [],
	surfaces: ["codex"],
	title: "Athena",
} as unknown as AgentRecord;

const graph = {
	agents: [agent],
	byId: new Map([["athena", agent]]),
	commands: [],
	guidance: [
		{
			authority: "root",
			body: "body.md",
			body_content: "Use source records as truth.",
			description: "Core",
			id: "core",
			injection_point: "project",
			kind: "guidance",
			location: {
				bodyPath: "body.md",
				directory: "source/guidance/core",
				metadataPath: "guidance.toml",
			},
			raw: {},
			surfaces: ["codex"],
			title: "Core",
		},
	],
	modelPlans: [],
	policies: [
		{
			blocking: true,
			category: "completion_gate",
			description: "Gate",
			event_intent: "completion",
			failure_mode: "fail_closed",
			handler_class: "command_script",
			id: "completion-gate",
			kind: "policy",
			location: {
				bodyPath: undefined,
				directory: "source/policies/completion-gate",
				metadataPath: "policy.toml",
			},
			raw: {},
			severity: "error",
			surface_events: ["Stop"],
			surface_mappings: { codex: "Stop" },
			surfaces: ["codex"],
			test_payloads: [],
			tests: [],
			title: "Gate",
		},
	],
	records: [],
	skills: [],
	surfaceConfigs: [],
} as unknown as SourceGraph;

describe("OAL prompt layer rendering", () => {
	test("renders deterministic layer order with route contract", () => {
		const output = renderPromptLayerBlock(graph, "codex", {
			agent,
			routeContract: "readonly",
		});

		expect(output.indexOf("### Global guidance")).toBeLessThan(
			output.indexOf("### Surface guidance"),
		);
		expect(output).toContain("Use source records as truth.");
		expect(output).toContain("Route contract: readonly.");
		expect(output).toContain("completion-gate:fail_closed");
	});
});
