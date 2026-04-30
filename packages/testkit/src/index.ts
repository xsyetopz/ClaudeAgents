import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WritePlan } from "@openagentlayer/render";
import type { SourceGraph } from "@openagentlayer/types";

export async function createFixtureRoot(): Promise<string> {
	return await Bun.$`mktemp -d`.text().then((output) => output.trim());
}

export async function writeAgent(
	root: string,
	options: {
		readonly directory?: string;
		readonly id?: string;
		readonly prompt?: string;
		readonly routeContract?: string;
		readonly surfaces?: string;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const directory = join(
		root,
		"source",
		options.directory ?? "agents/duplicate-one",
	);
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "prompt.md"), "# Agent\n");
	await writeFile(
		join(directory, "agent.toml"),
		[
			`id = "${options.id ?? "fixture-agent"}"`,
			'kind = "agent"',
			'title = "Fixture Agent"',
			'role = "Fixture"',
			'description = "Fixture agent."',
			`prompt = "${options.prompt ?? "prompt.md"}"`,
			'mode = "both"',
			`route_contract = "${options.routeContract ?? "readonly"}"`,
			'handoff_contract = "result-evidence-blockers-files-next-action"',
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			"",
		].join("\n"),
	);
}

export async function writeModelPlan(
	root: string,
	options: {
		readonly id?: string;
		readonly surfaces?: string;
		readonly defaultModel?: string;
		readonly effort?: string;
		readonly assignedRole?: string;
		readonly assignedModel?: string;
		readonly assignedEffort?: string;
		readonly defaultPlan?: boolean;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const id = options.id ?? "codex-plus";
	const directory = join(root, "source", "model-plans", id);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "model-plan.toml"),
		[
			`id = "${id}"`,
			'kind = "model-plan"',
			'title = "Fixture Plan"',
			'description = "Fixture model plan."',
			`surfaces = ${options.surfaces ?? '["codex"]'}`,
			`default_plan = ${options.defaultPlan ?? true}`,
			`default_model = "${options.defaultModel ?? "gpt-5.4"}"`,
			`implementation_effort = "${options.effort ?? "medium"}"`,
			`plan_effort = "${options.effort ?? "medium"}"`,
			`review_effort = "${options.effort ?? "medium"}"`,
			`effort_ceiling = "${options.effort ?? "high"}"`,
			"long_context_routes = []",
			"",
			"[[role_assignments]]",
			`role = "${options.assignedRole ?? "fixture-agent"}"`,
			`model = "${options.assignedModel ?? options.defaultModel ?? "gpt-5.4"}"`,
			`effort = "${options.assignedEffort ?? options.effort ?? "medium"}"`,
			"",
		].join("\n"),
	);
}

export async function writeSkill(
	root: string,
	options: { readonly modelPolicy?: string } = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const directory = join(root, "source", "skills", "fixture-skill");
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "SKILL.md"), "# Skill\n");
	await writeFile(
		join(directory, "skill.toml"),
		[
			'id = "fixture-skill"',
			'kind = "skill"',
			'title = "Fixture Skill"',
			'description = "Fixture skill."',
			'body = "SKILL.md"',
			`model_policy = "${options.modelPolicy ?? "gpt-5.4"}"`,
			'surfaces = ["codex"]',
			"",
		].join("\n"),
	);
}

export async function writeCommand(
	root: string,
	options: { readonly hookPolicies?: string } = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const directory = join(root, "source", "commands", "fixture-command");
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "prompt.md"), "# Command\n");
	await writeFile(
		join(directory, "command.toml"),
		[
			'id = "fixture-command"',
			'kind = "command"',
			'title = "Fixture Command"',
			'description = "Fixture command."',
			'owner_role = "fixture-agent"',
			'prompt_template = "prompt.md"',
			`hook_policies = ${options.hookPolicies ?? "[]"}`,
			'surfaces = ["codex"]',
			"",
		].join("\n"),
	);
}

export async function writePolicy(
	root: string,
	options: {
		readonly surfaceEvents?: string;
		readonly surfaceMappings?: string;
	} = {},
): Promise<void> {
	await writeFixtureSurfaceConfigs(root);
	const directory = join(root, "source", "policies", "fixture-policy");
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "policy.toml"),
		[
			'id = "fixture-policy"',
			'kind = "policy"',
			'title = "Fixture Policy"',
			'description = "Fixture policy."',
			'category = "completion_gate"',
			'severity = "error"',
			'event_intent = "completion"',
			`surface_events = ${options.surfaceEvents ?? '["Stop"]'}`,
			"test_payloads = []",
			"tests = []",
			'surfaces = ["codex"]',
			"",
			`surface_mappings = ${options.surfaceMappings ?? '{ codex = "Stop" }'}`,
			"",
		].join("\n"),
	);
}

export async function writeFixtureSurfaceConfigs(root: string): Promise<void> {
	await writeFixtureSurfaceConfig(root, "codex");
	await writeFixtureSurfaceConfig(root, "claude-code");
	await writeFixtureSurfaceConfig(root, "opencode");
}

async function writeFixtureSurfaceConfig(
	root: string,
	surface: "codex" | "claude-code" | "opencode",
): Promise<void> {
	const directory = join(root, "source", "surface-configs", surface);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "surface-config.toml"),
		[
			`id = "${surface}-surface-config"`,
			'kind = "surface-config"',
			`title = "${surface} Surface Config"`,
			`description = "${surface} fixture surface config."`,
			`surface = "${surface}"`,
			`surfaces = ["${surface}"]`,
			'allowed_key_paths = ["*"]',
			"do_not_emit_key_paths = []",
			"validation_rules = []",
			"",
			"[project_defaults]",
			"",
			"[default_profile]",
			'profile_id = "fixture"',
			'placement = "generated-project-profile"',
			"emitted_key_paths = []",
			'source_url = "fixture"',
			'validation = "fixture"',
			"",
		].join("\n"),
	);
}

export function graphRecordKeys(graph: SourceGraph): readonly string[] {
	return graph.records.map((record) => `${record.kind}:${record.id}`);
}

export function writePlanActions(plan: WritePlan): readonly string[] {
	return plan.entries.map((entry) => `${entry.action}\t${entry.path}`);
}
