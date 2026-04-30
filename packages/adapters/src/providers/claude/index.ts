import type {
	AdapterArtifact,
	AdapterBundle,
	AdapterContext,
	AdapterRenderResult,
	InstallOptions,
	InstallPlan,
	SurfaceAdapter,
} from "@openagentlayer/adapter-contract";
import {
	createUnsupportedCapabilityDiagnostic,
	validateAdapterBundle,
} from "@openagentlayer/adapter-contract";
import { renderRuntimeScript } from "@openagentlayer/runtime";
import type {
	CommandRecord,
	Diagnostic,
	SourceGraph,
	SourceRecord,
} from "@openagentlayer/types";
import {
	compareByPath,
	renderJsonFile,
	renderMarkdownWithFrontmatter,
	resolveModelAssignment,
	validateConfigObject,
} from "../../shared";

const SURFACE = "claude" as const;
const ARTIFACT_ROOT = ".claude/openagentlayer";

export const claudeAdapterId = SURFACE;

export function createClaudeAdapter(): SurfaceAdapter {
	return {
		id: SURFACE,
		surface: SURFACE,
		capabilities: [
			"agent",
			"skill",
			"command",
			"policy",
			"guidance",
			"config",
			"validation-metadata",
		],
		supports: (record) => record.surfaces.includes(SURFACE),
		render: renderRecord,
		renderBundle,
		validateBundle: validateAdapterBundle,
		installPlan,
	};
}

function renderRecord(
	record: SourceRecord,
	_context: AdapterContext,
): AdapterRenderResult {
	if (!record.surfaces.includes(SURFACE)) {
		return {
			artifacts: [],
			diagnostics: [createUnsupportedCapabilityDiagnostic(SURFACE, record)],
		};
	}
	return {
		artifacts: renderRecordArtifacts(record),
		diagnostics: [],
	};
}

function renderBundle(
	graph: SourceGraph,
	context: AdapterContext,
): AdapterBundle {
	const diagnostics: Diagnostic[] = [];
	const artifacts: AdapterArtifact[] = [renderSettingsArtifact(graph)];
	diagnostics.push(
		...validateConfigObject({
			artifactPath: ".claude/settings.json",
			config: renderClaudeSettings(graph),
			graph,
			surface: SURFACE,
		}),
	);

	for (const record of graph.records) {
		if (!record.surfaces.includes(SURFACE)) {
			continue;
		}
		artifacts.push(...renderRecordArtifacts(record, graph, context));
	}

	return {
		adapterId: SURFACE,
		surface: SURFACE,
		artifacts: artifacts.sort(compareByPath),
		diagnostics,
	};
}

function installPlan(
	bundle: AdapterBundle,
	options: InstallOptions,
): InstallPlan {
	return {
		surface: bundle.surface,
		scope: options.scope,
		entries: bundle.artifacts.map((artifact) => ({
			action: "write",
			path: artifact.path,
			content: artifact.content,
		})),
	};
}

function renderSettingsArtifact(graph: SourceGraph): AdapterArtifact {
	return {
		surface: SURFACE,
		kind: "config",
		path: ".claude/settings.json",
		content: renderJsonFile(renderClaudeSettings(graph)),
		sourceRecordIds: graph.records.map((record) => record.id).sort(),
	};
}

function renderRecordArtifacts(
	record: SourceRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact[] {
	switch (record.kind) {
		case "agent": {
			const assignment =
				graph === undefined
					? { effort: record.effort_ceiling, model: record.model_class }
					: resolveModelAssignment(
							graph,
							SURFACE,
							record.id,
							context?.modelPlanId,
						);
			return [
				{
					surface: SURFACE,
					kind: "agent",
					path: `.claude/agents/${record.id}.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							effort: assignment.effort ?? record.effort_ceiling,
							model: assignment.model ?? record.model_class,
							name: record.id,
							skills: record.skills,
							tools: record.permissions,
						},
						record.prompt_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		}
		case "skill":
			return [
				{
					surface: SURFACE,
					kind: "skill",
					path: `.claude/skills/${record.id}/SKILL.md`,
					content: renderMarkdownWithFrontmatter(
						{
							"allowed-tools": record.tool_grants,
							description: record.description,
							model: record.model_policy,
							name: record.id,
							"user-invocable": record.user_invocable,
							when_to_use: record.when_to_use,
						},
						record.body_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "command":
			return [renderClaudeCommandSkill(record, graph, context)];
		case "policy":
			return [
				{
					surface: SURFACE,
					kind: "hook",
					path: `${ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`,
					content: renderRuntimeScript(record.id),
					sourceRecordIds: [record.id],
				},
				{
					surface: SURFACE,
					kind: "validation-metadata",
					path: `${ARTIFACT_ROOT}/policies/${record.id}.json`,
					content: renderJsonFile({
						category: record.category,
						event_intent: record.event_intent,
						failure_mode: record.failure_mode,
						handler_class: record.handler_class,
						id: record.id,
						surface: SURFACE,
						surface_events: record.surface_events,
					}),
					sourceRecordIds: [record.id],
				},
			];
		case "guidance":
			return [
				{
					surface: SURFACE,
					kind: "instruction",
					path: `${ARTIFACT_ROOT}/guidance/${record.id}.md`,
					content: record.body_content,
					sourceRecordIds: [record.id],
				},
			];
		default:
			return [];
	}
}

function renderClaudeCommandSkill(
	record: CommandRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact {
	const assignment =
		graph === undefined
			? { model: record.model_policy }
			: resolveModelAssignment(
					graph,
					SURFACE,
					record.owner_role,
					context?.modelPlanId,
				);
	return {
		surface: SURFACE,
		kind: "command",
		path: `.claude/skills/command-${record.id}/SKILL.md`,
		content: renderMarkdownWithFrontmatter(
			{
				"argument-hint": record.arguments.join(" "),
				arguments: record.arguments,
				context: "fork",
				description: record.description,
				name: `command-${record.id}`,
				"user-invocable": true,
				agent: record.owner_role,
				model: record.model_policy ?? assignment.model,
			},
			record.prompt_template_content,
		),
		sourceRecordIds: [record.id],
	};
}

function renderClaudeSettings(graph: SourceGraph): Record<string, unknown> {
	const projectDefaults =
		graph.surfaceConfigs.find((record) => record.surface === SURFACE)
			?.project_defaults ?? {};
	const hooks: Record<string, unknown[]> = {};
	for (const record of graph.policies.filter((record) =>
		record.surfaces.includes(SURFACE),
	)) {
		const event = String(record.surface_mappings[SURFACE] ?? "Stop");
		hooks[event] = [
			...(hooks[event] ?? []),
			{
				hooks: [
					{
						command: `bun ${ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`,
						statusMessage: `checking ${record.id}`,
						timeout: 10,
						type: "command",
					},
				],
				...(record.matcher === undefined ? {} : { matcher: record.matcher }),
			},
		];
	}
	return {
		...projectDefaults,
		hooks,
	};
}
