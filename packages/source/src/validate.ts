import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type {
	Diagnostic,
	ModelId,
	SourceGraph,
	SourceRecord,
	Surface,
} from "@openagentlayer/types";
import {
	AGENT_MODES,
	CLAUDE_MODEL_IDS,
	CODEX_MODEL_IDS,
	EFFORT_LEVELS,
	KEBAB_CASE_PATTERN,
	MODEL_IDS,
	MODEL_PLAN_IDS,
	POLICY_CATEGORIES,
	POLICY_FAILURE_MODES,
	POLICY_HANDLER_CLASSES,
	RECORD_KINDS,
	ROUTE_KINDS,
	SURFACES,
} from "@openagentlayer/types/constants";

const RECORD_KIND_SET = new Set<string>([...RECORD_KINDS, "surface-config"]);
const SURFACE_SET = new Set<string>(SURFACES);
const AGENT_MODE_SET = new Set<string>(AGENT_MODES);
const ROUTE_KIND_SET = new Set<string>(ROUTE_KINDS);
const POLICY_CATEGORY_SET = new Set<string>(POLICY_CATEGORIES);
const POLICY_FAILURE_MODE_SET = new Set<string>(POLICY_FAILURE_MODES);
const POLICY_HANDLER_CLASS_SET = new Set<string>(POLICY_HANDLER_CLASSES);
const MODEL_ID_SET = new Set<string>(MODEL_IDS);
const MODEL_PLAN_ID_SET = new Set<string>(MODEL_PLAN_IDS);
const CODEX_MODEL_ID_SET = new Set<string>(CODEX_MODEL_IDS);
const CLAUDE_MODEL_ID_SET = new Set<string>(CLAUDE_MODEL_IDS);

export function isSurface(value: string): value is Surface {
	return SURFACE_SET.has(value);
}

export function validateRecordIdentity(
	id: string,
	kind: string,
	surfaces: readonly string[],
	path: string,
	diagnostics: Diagnostic[],
): void {
	if (!KEBAB_CASE_PATTERN.test(id)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-id",
				`Record id '${id}' must be lowercase kebab-case.`,
				path,
			),
		);
	}

	if (!RECORD_KIND_SET.has(kind)) {
		diagnostics.push(
			errorDiagnostic("unknown-kind", `Unknown record kind '${kind}'.`, path),
		);
	}

	for (const surface of surfaces) {
		if (!isSurface(surface)) {
			diagnostics.push(
				errorDiagnostic(
					"unknown-surface",
					`Unknown surface '${surface}'.`,
					path,
				),
			);
		}
	}
}

export function validateRecordFields(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	validateRouteContract(record, diagnostics);
	validateModelPolicy(record, diagnostics);
	validateModelPlan(record, diagnostics);
	validateSurfaceConfig(record, diagnostics);

	if (record.kind === "agent" && !AGENT_MODE_SET.has(record.mode)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-agent-mode",
				`Unknown agent mode '${record.mode}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.kind === "agent" && record.handoff_contract === undefined) {
		diagnostics.push(
			errorDiagnostic(
				"missing-handoff-contract",
				`Agent '${record.id}' must define a handoff contract.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.kind === "agent" &&
		record.effort_ceiling !== undefined &&
		!EFFORT_LEVEL_SET.has(record.effort_ceiling)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-effort",
				`Unknown effort ceiling '${record.effort_ceiling}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.kind === "policy") {
		if (!POLICY_CATEGORY_SET.has(record.category)) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-policy-category",
					`Unknown policy category '${record.category}'.`,
					record.location.metadataPath,
				),
			);
		}

		if (
			record.failure_mode !== undefined &&
			!POLICY_FAILURE_MODE_SET.has(record.failure_mode)
		) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-failure-mode",
					`Unknown failure mode '${record.failure_mode}'.`,
					record.location.metadataPath,
				),
			);
		}

		if (
			record.handler_class !== undefined &&
			!POLICY_HANDLER_CLASS_SET.has(record.handler_class)
		) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-handler-class",
					`Unknown handler class '${record.handler_class}'.`,
					record.location.metadataPath,
				),
			);
		}
	}
}

export function validateGraphReferences(
	graph: SourceGraph,
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const agentIds = new Set(graph.agents.map((record) => record.id));
	const skillIds = new Set(graph.skills.map((record) => record.id));
	const policyIds = new Set(graph.policies.map((record) => record.id));

	for (const record of graph.agents) {
		for (const skillId of record.skills) {
			if (!skillIds.has(skillId)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-skill-reference",
						`Agent '${record.id}' references unknown skill '${skillId}'.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	for (const record of graph.commands) {
		if (!agentIds.has(record.owner_role)) {
			diagnostics.push(
				errorDiagnostic(
					"unknown-owner-role",
					`Command '${record.id}' references unknown owner role '${record.owner_role}'.`,
					record.location.metadataPath,
				),
			);
		}

		for (const policyId of record.hook_policies) {
			if (!policyIds.has(policyId)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-policy-reference",
						`Command '${record.id}' references unknown policy '${policyId}'.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	for (const record of graph.modelPlans) {
		for (const assignment of record.role_assignments) {
			if (!agentIds.has(assignment.role)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-role-assignment",
						`Model plan '${record.id}' references unknown role '${assignment.role}'.`,
						record.location.metadataPath,
					),
				);
			}
		}

		for (const override of record.deep_route_overrides) {
			if (!agentIds.has(override.role)) {
				diagnostics.push(
					errorDiagnostic(
						"unknown-role-assignment",
						`Model plan '${record.id}' references unknown override role '${override.role}'.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	for (const surface of SURFACES) {
		const defaultPlans = graph.modelPlans.filter(
			(record) =>
				record.default_plan === true && record.surfaces.includes(surface),
		);
		if (defaultPlans.length > 1) {
			for (const record of defaultPlans) {
				diagnostics.push(
					errorDiagnostic(
						"duplicate-default-model-plan",
						`Surface '${surface}' has multiple default model plans.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	for (const surface of SURFACES) {
		const surfaceConfigs = graph.surfaceConfigs.filter(
			(record) => record.surface === surface,
		);
		if (surfaceConfigs.length === 0) {
			diagnostics.push(
				errorDiagnostic(
					"missing-surface-config",
					`Missing surface config for '${surface}'.`,
				),
			);
		}
		if (surfaceConfigs.length > 1) {
			for (const record of surfaceConfigs) {
				diagnostics.push(
					errorDiagnostic(
						"duplicate-surface-config",
						`Surface '${surface}' has multiple surface config records.`,
						record.location.metadataPath,
					),
				);
			}
		}
	}

	return diagnostics;
}

const EFFORT_LEVEL_SET = new Set<string>(EFFORT_LEVELS);

function validateRouteContract(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	const routeContract =
		record.kind === "agent" ||
		record.kind === "skill" ||
		record.kind === "command"
			? record.route_contract
			: undefined;
	if (routeContract !== undefined && !ROUTE_KIND_SET.has(routeContract)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-route-contract",
				`Unknown route contract '${routeContract}'.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateModelPolicy(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	const modelPolicy =
		record.kind === "skill" || record.kind === "command"
			? record.model_policy
			: undefined;
	if (modelPolicy !== undefined && !MODEL_ID_SET.has(modelPolicy)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-policy",
				`Unknown model policy '${modelPolicy}'.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateModelPlan(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	if (record.kind !== "model-plan") {
		return;
	}

	if (!MODEL_PLAN_ID_SET.has(record.id)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-plan-id",
				`Unknown model plan id '${record.id}'.`,
				record.location.metadataPath,
			),
		);
	}

	validatePlanModel(record.default_model, record, diagnostics, "default_model");
	validatePlanEffort(
		record.implementation_effort,
		record,
		diagnostics,
		"implementation_effort",
	);
	validatePlanEffort(record.plan_effort, record, diagnostics, "plan_effort");
	validatePlanEffort(
		record.review_effort,
		record,
		diagnostics,
		"review_effort",
	);
	validatePlanEffort(
		record.effort_ceiling,
		record,
		diagnostics,
		"effort_ceiling",
	);

	for (const assignment of record.role_assignments) {
		validatePlanModel(assignment.model, record, diagnostics, assignment.role);
		validatePlanEffort(assignment.effort, record, diagnostics, assignment.role);
	}

	for (const override of record.deep_route_overrides) {
		validatePlanModel(override.model, record, diagnostics, override.route);
		validatePlanEffort(override.effort, record, diagnostics, override.route);
	}
}

function validateSurfaceConfig(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	if (record.kind !== "surface-config") {
		return;
	}

	if (!SURFACE_SET.has(record.surface)) {
		diagnostics.push(
			errorDiagnostic(
				"unknown-surface-config-surface",
				`Unknown surface config surface '${record.surface}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (!record.surfaces.includes(record.surface)) {
		diagnostics.push(
			errorDiagnostic(
				"surface-config-surface-mismatch",
				`Surface config '${record.id}' must include its surface '${record.surface}' in surfaces.`,
				record.location.metadataPath,
			),
		);
	}
}

function validatePlanModel(
	model: ModelId,
	record: Extract<SourceRecord, { readonly kind: "model-plan" }>,
	diagnostics: Diagnostic[],
	context: string,
): void {
	if (!MODEL_ID_SET.has(model)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-plan-model",
				`Model plan '${record.id}' has unknown model '${model}' for '${context}'.`,
				record.location.metadataPath,
			),
		);
		return;
	}

	for (const surface of record.surfaces) {
		if (surface === "codex" && !CODEX_MODEL_ID_SET.has(model)) {
			diagnostics.push(
				errorDiagnostic(
					"unsupported-model-for-surface",
					`Model plan '${record.id}' uses non-Codex model '${model}' for '${context}'.`,
					record.location.metadataPath,
				),
			);
		}
		if (surface === "claude-code" && !CLAUDE_MODEL_ID_SET.has(model)) {
			diagnostics.push(
				errorDiagnostic(
					"unsupported-model-for-surface",
					`Model plan '${record.id}' uses non-Claude model '${model}' for '${context}'.`,
					record.location.metadataPath,
				),
			);
		}
	}
}

function validatePlanEffort(
	effort: string,
	record: Extract<SourceRecord, { readonly kind: "model-plan" }>,
	diagnostics: Diagnostic[],
	context: string,
): void {
	if (!EFFORT_LEVEL_SET.has(effort)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-plan-effort",
				`Model plan '${record.id}' has unknown effort '${effort}' for '${context}'.`,
				record.location.metadataPath,
			),
		);
	}
}
