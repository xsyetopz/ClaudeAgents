import {
	readBoolean,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	Diagnostic,
	EffortLevel,
	ModelId,
	ModelPlanAssignment,
	ModelPlanOverride,
	ModelPlanRecord,
	UnknownMap,
} from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";

export function buildModelPlanRecord(
	base: SourceRecordBase,
	diagnostics: Diagnostic[],
): ModelPlanRecord | undefined {
	const source = base.raw;
	const defaultModel = readString(
		source,
		"default_model",
		base.location.metadataPath,
		diagnostics,
	);
	const implementationEffort = readString(
		source,
		"implementation_effort",
		base.location.metadataPath,
		diagnostics,
	);
	const planEffort = readString(
		source,
		"plan_effort",
		base.location.metadataPath,
		diagnostics,
	);
	const reviewEffort = readString(
		source,
		"review_effort",
		base.location.metadataPath,
		diagnostics,
	);
	const effortCeiling = readString(
		source,
		"effort_ceiling",
		base.location.metadataPath,
		diagnostics,
	);
	if (
		defaultModel === undefined ||
		implementationEffort === undefined ||
		planEffort === undefined ||
		reviewEffort === undefined ||
		effortCeiling === undefined
	) {
		return undefined;
	}

	return {
		...base,
		kind: "model-plan",
		default_plan: readBoolean(source, "default_plan"),
		default_model: defaultModel as ModelId,
		implementation_effort: implementationEffort as EffortLevel,
		plan_effort: planEffort as EffortLevel,
		review_effort: reviewEffort as EffortLevel,
		effort_ceiling: effortCeiling as EffortLevel,
		role_assignments: readAssignmentArray(
			source,
			"role_assignments",
			base.location.metadataPath,
			diagnostics,
		),
		deep_route_overrides: readOverrideArray(
			source,
			"deep_route_overrides",
			base.location.metadataPath,
			diagnostics,
		),
		long_context_routes: readStringArray(
			source,
			"long_context_routes",
			base.location.metadataPath,
			diagnostics,
		),
	};
}

function readAssignmentArray(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): readonly ModelPlanAssignment[] {
	const values = readObjectArray(source, key, path, diagnostics);
	return values.flatMap((value) => {
		const role = readString(value, "role", path, diagnostics);
		const model = readString(value, "model", path, diagnostics);
		const effort = readString(value, "effort", path, diagnostics);
		if (role === undefined || model === undefined || effort === undefined) {
			return [];
		}
		return [{ role, model: model as ModelId, effort: effort as EffortLevel }];
	});
}

function readOverrideArray(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): readonly ModelPlanOverride[] {
	const values = readObjectArray(source, key, path, diagnostics);
	return values.flatMap((value) => {
		const role = readString(value, "role", path, diagnostics);
		const route = readString(value, "route", path, diagnostics);
		const model = readString(value, "model", path, diagnostics);
		const effort = readString(value, "effort", path, diagnostics);
		if (
			role === undefined ||
			route === undefined ||
			model === undefined ||
			effort === undefined
		) {
			return [];
		}
		return [
			{
				role,
				route,
				model: model as ModelId,
				effort: effort as EffortLevel,
			},
		];
	});
}

function readObjectArray(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): readonly UnknownMap[] {
	const value = source[key];
	if (value === undefined) {
		return [];
	}

	if (
		!Array.isArray(value) ||
		value.some(
			(item) =>
				typeof item !== "object" || item === null || Array.isArray(item),
		)
	) {
		diagnostics.push({
			level: "error",
			code: "invalid-array",
			message: `Field '${key}' must be an object array.`,
			path,
		});
		return [];
	}

	return value as readonly UnknownMap[];
}
