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
	PolicyRecord,
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

const SURFACE = "opencode" as const;
const ARTIFACT_ROOT = ".opencode/openagentlayer";

export const opencodeAdapterId = SURFACE;

export function createOpenCodeAdapter(): SurfaceAdapter {
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
			"plugin",
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
	const artifacts: AdapterArtifact[] = renderBundleArtifacts(graph, context);
	diagnostics.push(
		...validateConfigObject({
			artifactPath: "opencode.json",
			config: renderOpenCodeConfig(graph, context),
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

function renderBundleArtifacts(
	graph: SourceGraph,
	context: AdapterContext,
): AdapterArtifact[] {
	return [
		{
			surface: SURFACE,
			kind: "config",
			path: "opencode.json",
			content: renderJsonFile(renderOpenCodeConfig(graph, context)),
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
		{
			surface: SURFACE,
			kind: "plugin",
			path: ".opencode/plugins/openagentlayer.ts",
			content: renderOpenCodePlugin(graph.policies),
			sourceRecordIds: graph.policies.map((record) => record.id).sort(),
		},
	];
}

function renderOpenCodeConfig(
	graph: SourceGraph,
	context: AdapterContext,
): Record<string, unknown> {
	const primaryAgent = graph.agents[0]?.id ?? "athena";
	const projectDefaults =
		graph.surfaceConfigs.find((record) => record.surface === SURFACE)
			?.project_defaults ?? {};
	return {
		...projectDefaults,
		agent: Object.fromEntries(
			graph.agents.map((record) => [
				record.id,
				{
					description: record.description,
					model: resolveModelAssignment(
						graph,
						SURFACE,
						record.id,
						context.modelPlanId,
					).model,
				},
			]),
		),
		command: Object.fromEntries(
			graph.commands.map((record) => [
				record.id,
				{
					agent: record.owner_role,
					description: record.description,
					model:
						record.model_policy ??
						resolveModelAssignment(
							graph,
							SURFACE,
							record.owner_role,
							context.modelPlanId,
						).model,
					subtask: true,
					template: record.prompt_template_content.trim(),
				},
			]),
		),
		default_agent: primaryAgent,
		permission: {
			...(projectDefaults["permission"] as Record<string, unknown>),
			skill: Object.fromEntries(
				graph.skills.map((record) => [record.id, "allow"]),
			),
		},
	};
}

function renderRecordArtifacts(
	record: SourceRecord,
	graph?: SourceGraph,
	context?: AdapterContext,
): AdapterArtifact[] {
	switch (record.kind) {
		case "agent":
			return [
				{
					surface: SURFACE,
					kind: "agent",
					path: `.opencode/agents/${record.id}.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							name: record.id,
						},
						record.prompt_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "skill":
			return [
				{
					surface: SURFACE,
					kind: "skill",
					path: `.opencode/skills/${record.id}/SKILL.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							license: "MIT",
							name: record.id,
						},
						record.body_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "command":
			return [renderOpenCodeCommand(record, graph, context)];
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

function renderOpenCodeCommand(
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
		path: `.opencode/commands/${record.id}.md`,
		content: renderMarkdownWithFrontmatter(
			{
				agent: record.owner_role,
				description: record.description,
				model: record.model_policy ?? assignment.model,
				subtask: true,
			},
			record.prompt_template_content,
		),
		sourceRecordIds: [record.id],
	};
}

function renderOpenCodePlugin(policies: readonly PolicyRecord[]): string {
	const handlers = policies
		.filter((record) => record.surfaces.includes(SURFACE))
		.map(renderOpenCodeHandler)
		.join("\n");
	return [
		'import type { Plugin } from "@opencode-ai/plugin";',
		"",
		'export const openAgentLayerSurface = "opencode";',
		"",
		"async function runPolicy(script: string, payload: unknown): Promise<void> {",
		'\tconst process = Bun.spawn(["bun", script], {',
		'\t\tstdin: "pipe",',
		'\t\tstdout: "pipe",',
		'\t\tstderr: "pipe",',
		"\t});",
		"\tprocess.stdin.write(JSON.stringify(payload));",
		"\tprocess.stdin.end();",
		"\tconst exitCode = await process.exited;",
		"\tif (exitCode !== 0) {",
		"\t\tthrow new Error(await new Response(process.stdout).text());",
		"\t}",
		"}",
		"",
		"export const OpenAgentLayerPlugin: Plugin = async () => {",
		"\treturn {",
		handlers,
		"\t};",
		"};",
		"",
	].join("\n");
}

function renderOpenCodeHandler(record: PolicyRecord): string {
	const event = String(record.surface_mappings[SURFACE] ?? "session.status");
	const runtimePath = `${ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`;
	return [
		`\t\t${JSON.stringify(event)}: async (input: unknown) => {`,
		`\t\t\tawait runPolicy(${JSON.stringify(runtimePath)}, { event: ${JSON.stringify(event)}, policy_id: ${JSON.stringify(record.id)}, surface: ${JSON.stringify(SURFACE)}, tool_input: input });`,
		"\t\t},",
	].join("\n");
}
