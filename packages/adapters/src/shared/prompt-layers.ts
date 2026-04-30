import type {
	AgentRecord,
	CommandRecord,
	SkillRecord,
	SourceGraph,
	Surface,
} from "@openagentlayer/types";

export type PromptLayerKind =
	| "global-guidance"
	| "surface-guidance"
	| "role-prompt"
	| "command-prompt"
	| "skill-instructions"
	| "hook-context"
	| "completion-contract";

export interface PromptLayerOptions {
	readonly agent?: AgentRecord;
	readonly command?: CommandRecord;
	readonly skill?: SkillRecord;
	readonly routeContract?: string | undefined;
}

export function renderPromptLayerBlock(
	graph: SourceGraph,
	surface: Surface,
	options: PromptLayerOptions = {},
): string {
	return [
		"## OAL Prompt Layers",
		"",
		...renderGlobalGuidance(graph, surface),
		...renderSurfaceGuidance(surface),
		...renderRolePrompt(options.agent),
		...renderRoleAffinities(options.agent),
		...renderCommandPrompt(options.command),
		...renderSkillInstructions(options.skill),
		...renderHookContext(graph, surface),
		...renderCompletionContract(options.routeContract),
	].join("\n");
}

export function renderProjectPromptInstructions(
	graph: SourceGraph,
	surface: Surface,
): string {
	return renderPromptLayerBlock(graph, surface, {
		routeContract: "readonly",
	});
}

function renderGlobalGuidance(
	graph: SourceGraph,
	surface: Surface,
): readonly string[] {
	const body = graph.guidance
		.filter(
			(record) =>
				record.surfaces.includes(surface) &&
				record.authority === "root" &&
				record.injection_point === "project",
		)
		.map((record) => record.body_content.trim())
		.join("\n\n");
	return ["### Global guidance", "", body || "No global guidance record.", ""];
}

function renderSurfaceGuidance(surface: Surface): readonly string[] {
	return [
		"### Surface guidance",
		"",
		`Render behavior in native ${surface} files. Do not invent harness behavior or unsupported provider keys.`,
		"",
	];
}

function renderRolePrompt(record: AgentRecord | undefined): readonly string[] {
	if (record === undefined) {
		return [];
	}
	return ["### Role prompt", "", record.prompt_content.trim(), ""];
}

function renderRoleAffinities(
	record: AgentRecord | undefined,
): readonly string[] {
	if (record === undefined) {
		return [];
	}
	return [
		"### Role affinities",
		"",
		`Skills: ${formatList(record.skills)}.`,
		`Commands: ${formatList(record.commands)}.`,
		`Policies: ${formatList(record.policies)}.`,
		`Tools: ${formatList(record.permissions)}.`,
		`Handoff contract: ${record.handoff_contract ?? "none"}.`,
		record.route_contract === undefined
			? "Route contract: readonly."
			: `Route contract: ${record.route_contract}.`,
		"",
	];
}

function renderCommandPrompt(
	record: CommandRecord | undefined,
): readonly string[] {
	if (record === undefined) {
		return [];
	}
	return ["### Command prompt", "", record.prompt_template_content.trim(), ""];
}

function formatList(values: readonly string[] | undefined): string {
	return values === undefined || values.length === 0
		? "none"
		: values.join(", ");
}

function renderSkillInstructions(
	record: SkillRecord | undefined,
): readonly string[] {
	if (record === undefined) {
		return [];
	}
	return ["### Skill instructions", "", record.body_content.trim(), ""];
}

function renderHookContext(
	graph: SourceGraph,
	surface: Surface,
): readonly string[] {
	const policies = graph.policies
		.filter((record) => record.surfaces.includes(surface))
		.map((record) => `${record.id}:${record.failure_mode ?? "warn_only"}`)
		.join(", ");
	return [
		"### Hook-injected context",
		"",
		`Runtime hook context may append route, surface, policy, and validation metadata. Active policies: ${policies}.`,
		"",
	];
}

function renderCompletionContract(
	routeContract: string | undefined,
): readonly string[] {
	const contract = routeContract ?? "readonly";
	return [
		"### Completion contract",
		"",
		`Route contract: ${contract}. Return validation evidence when execution or edits occur; report blockers with concrete missing evidence.`,
		"",
	];
}
