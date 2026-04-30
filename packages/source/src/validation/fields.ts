import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceRecord } from "@openagentlayer/types";
import {
	AGENT_MODE_SET,
	POLICY_CATEGORY_SET,
	POLICY_FAILURE_MODE_SET,
	POLICY_HANDLER_CLASS_SET,
	ROUTE_KIND_SET,
} from "./identity";
import { isKnownEffort, isKnownModelId, validateModelPlan } from "./models";
import { validateSurfaceConfig } from "./surface-config";

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
		!isKnownEffort(record.effort_ceiling)
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
		validatePolicyRecordFields(record, diagnostics);
	}
}

function validatePolicyRecordFields(
	record: Extract<SourceRecord, { readonly kind: "policy" }>,
	diagnostics: Diagnostic[],
): void {
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
	if (modelPolicy !== undefined && !isKnownModelId(modelPolicy)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-policy",
				`Unknown model policy '${modelPolicy}'.`,
				record.location.metadataPath,
			),
		);
	}
}
