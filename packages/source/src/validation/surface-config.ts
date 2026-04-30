import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceRecord } from "@openagentlayer/types";
import { SURFACE_SET } from "./identity";

export function validateSurfaceConfig(
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
