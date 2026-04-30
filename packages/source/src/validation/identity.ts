import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, Surface } from "@openagentlayer/types";
import {
	AGENT_MODES,
	KEBAB_CASE_PATTERN,
	POLICY_CATEGORIES,
	POLICY_FAILURE_MODES,
	POLICY_HANDLER_CLASSES,
	RECORD_KINDS,
	ROUTE_KINDS,
	SURFACES,
} from "@openagentlayer/types/constants";

export const RECORD_KIND_SET = new Set<string>([
	...RECORD_KINDS,
	"surface-config",
]);
export const SURFACE_SET = new Set<string>(SURFACES);
export const AGENT_MODE_SET = new Set<string>(AGENT_MODES);
export const ROUTE_KIND_SET = new Set<string>(ROUTE_KINDS);
export const POLICY_CATEGORY_SET = new Set<string>(POLICY_CATEGORIES);
export const POLICY_FAILURE_MODE_SET = new Set<string>(POLICY_FAILURE_MODES);
export const POLICY_HANDLER_CLASS_SET = new Set<string>(POLICY_HANDLER_CLASSES);

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
