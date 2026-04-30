import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, ModelId, SourceRecord } from "@openagentlayer/types";
import {
	CLAUDE_MODEL_IDS,
	CODEX_MODEL_IDS,
	EFFORT_LEVELS,
	MODEL_IDS,
	MODEL_PLAN_IDS,
} from "@openagentlayer/types/constants";

const MODEL_ID_SET = new Set<string>(MODEL_IDS);
const MODEL_PLAN_ID_SET = new Set<string>(MODEL_PLAN_IDS);
const CODEX_MODEL_ID_SET = new Set<string>(CODEX_MODEL_IDS);
const CLAUDE_MODEL_ID_SET = new Set<string>(CLAUDE_MODEL_IDS);
const EFFORT_LEVEL_SET = new Set<string>(EFFORT_LEVELS);

export function isKnownModelId(model: string): boolean {
	return MODEL_ID_SET.has(model);
}

export function isKnownEffort(effort: string): boolean {
	return EFFORT_LEVEL_SET.has(effort);
}

export function validateModelPlan(
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
		if (surface === "claude" && !CLAUDE_MODEL_ID_SET.has(model)) {
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
