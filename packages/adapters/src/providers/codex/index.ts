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
	renderTomlDocument,
	resolveModelAssignment,
	validateConfigObject,
} from "../../shared";

const SURFACE = "codex" as const;
const ARTIFACT_ROOT = ".codex/openagentlayer";
const PLUGIN_ROOT = `${ARTIFACT_ROOT}/plugin`;

export const codexAdapterId = SURFACE;

export function createCodexAdapter(): SurfaceAdapter {
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
	const artifacts: AdapterArtifact[] = renderBundleArtifacts(graph);
	diagnostics.push(
		...validateConfigObject({
			artifactPath: `${ARTIFACT_ROOT}/config.toml`,
			config: Bun.TOML.parse(renderCodexConfig(graph)) as Record<
				string,
				unknown
			>,
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

function renderBundleArtifacts(graph: SourceGraph): AdapterArtifact[] {
	return [
		{
			surface: SURFACE,
			kind: "plugin",
			path: `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
			content: renderJsonFile({
				description:
					"OpenAgentLayer routes, skills, and hook defaults for Codex",
				interface: {
					capabilities: ["Read", "Write", "Bash", "Search"],
					displayName: "OpenAgentLayer",
					shortDescription: "Portable agent behavior layer for Codex",
				},
				name: "openagentlayer",
				skills: "./skills/",
				version: "4.0.0",
			}),
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
		{
			surface: SURFACE,
			kind: "config",
			path: `${ARTIFACT_ROOT}/config.toml`,
			content: renderCodexConfig(graph),
			sourceRecordIds: graph.records.map((record) => record.id).sort(),
		},
	];
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
					? { model: undefined }
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
					path: `${ARTIFACT_ROOT}/agents/${record.id}.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							model: assignment.model ?? record.model_class,
							name: record.id,
							role: record.role,
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
					path: `${PLUGIN_ROOT}/skills/${record.id}/SKILL.md`,
					content: renderMarkdownWithFrontmatter(
						{
							description: record.description,
							name: record.id,
							"user-invocable": record.user_invocable,
						},
						record.body_content,
					),
					sourceRecordIds: [record.id],
				},
			];
		case "command":
			return [renderCodexCommandSkill(record, graph, context)];
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

function renderCodexCommandSkill(
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
		path: `${PLUGIN_ROOT}/skills/command-${record.id}/SKILL.md`,
		content: renderMarkdownWithFrontmatter(
			{
				description: record.description,
				model: record.model_policy ?? assignment.model,
				name: `command-${record.id}`,
				"user-invocable": true,
			},
			[
				record.prompt_template_content.trimEnd(),
				"",
				`Owner role: ${record.owner_role}.`,
				`Route contract: ${record.route_contract ?? "none"}.`,
				`Arguments: ${record.arguments.join(", ") || "none"}.`,
			].join("\n"),
		),
		sourceRecordIds: [record.id],
	};
}

function renderCodexConfig(graph: SourceGraph): string {
	const config = renderCodexConfigObject(graph);
	const baseConfig = renderTomlDocument(config);
	const hooks = graph.policies
		.filter((record) => record.surfaces.includes(SURFACE))
		.map(renderCodexHook)
		.join("\n");
	return hooks === "" ? baseConfig : `${baseConfig}\n${hooks}`;
}

function renderCodexConfigObject(graph: SourceGraph) {
	const profiles = Object.fromEntries(
		graph.modelPlans
			.filter((record) => record.surfaces.includes(SURFACE))
			.map((record) => [
				record.id,
				{
					approval_policy: "on-request",
					approvals_reviewer: "auto_review",
					model: record.default_model,
					model_reasoning_effort: record.implementation_effort,
					plan_mode_reasoning_effort: record.plan_effort,
				},
			]),
	);
	const projectDefaults =
		graph.surfaceConfigs.find((record) => record.surface === SURFACE)
			?.project_defaults ?? {};
	return {
		...projectDefaults,
		profiles:
			Object.keys(profiles).length === 0
				? {
						openagentlayer: {
							approval_policy: "on-request",
							approvals_reviewer: "auto_review",
							model: "gpt-5.4",
							model_reasoning_effort: "medium",
							plan_mode_reasoning_effort: "medium",
						},
					}
				: profiles,
	};
}

function renderCodexHook(record: PolicyRecord): string {
	const event = String(record.surface_mappings[SURFACE] ?? "Stop");
	const matcher =
		record.matcher === undefined || event === "Stop"
			? []
			: [`matcher = ${JSON.stringify(record.matcher)}`];
	const runtimePath = `${ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`;
	return [
		`[[hooks.${event}]]`,
		...matcher,
		`[[hooks.${event}.hooks]]`,
		'type = "command"',
		`command = ${JSON.stringify(`bun ${runtimePath}`)}`,
		"timeout = 10",
		"async = false",
		`statusMessage = ${JSON.stringify(`checking ${record.id}`)}`,
		"",
	].join("\n");
}
