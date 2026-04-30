import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceRecord, Surface } from "@openagentlayer/types";
import type { AdapterBundle } from "./artifacts";

export interface UnsupportedCapabilityDiagnostic extends Diagnostic {
	readonly level: "warning";
	readonly code: "unsupported-capability";
}

export function createUnsupportedCapabilityDiagnostic(
	surface: Surface,
	record: SourceRecord,
): UnsupportedCapabilityDiagnostic {
	return {
		level: "warning",
		code: "unsupported-capability",
		message: `Surface '${surface}' does not support source record '${record.kind}:${record.id}'.`,
		path: record.location.metadataPath,
	};
}

export function validateAdapterBundle(
	bundle: AdapterBundle,
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const paths = new Set<string>();

	for (const artifact of bundle.artifacts) {
		if (artifact.surface !== bundle.surface) {
			diagnostics.push(
				errorDiagnostic(
					"adapter-surface-mismatch",
					`Artifact '${artifact.path}' targets '${artifact.surface}' inside '${bundle.surface}' bundle.`,
					artifact.path,
				),
			);
		}

		if (paths.has(artifact.path)) {
			diagnostics.push(
				errorDiagnostic(
					"duplicate-artifact-path",
					`Adapter bundle contains duplicate artifact path '${artifact.path}'.`,
					artifact.path,
				),
			);
		}
		paths.add(artifact.path);
	}

	return diagnostics;
}
