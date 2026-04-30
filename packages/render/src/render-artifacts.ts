import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import { graphToJson } from "@openagentlayer/source/graph";
import type { Diagnostic, SourceGraph } from "@openagentlayer/types";
import { createRenderContext } from "./context";
import { stableJson } from "./json";
import { createAdapterRegistry } from "./registry";

export function createDesiredFiles(graph: SourceGraph): Map<string, string> {
	const context = createRenderContext(graph);
	const desiredFiles = new Map([
		[
			"manifest.json",
			`${stableJson({ generated_by: "openagentlayer", context })}\n`,
		],
		["graph.json", `${stableJson(graphToJson(graph))}\n`],
	]);

	for (const bundle of createAdapterRegistry().renderAllBundles(graph)) {
		for (const artifact of bundle.artifacts) {
			desiredFiles.set(artifact.path, artifact.content);
		}
		desiredFiles.set(
			`surfaces/${bundle.surface}/bundle.json`,
			`${stableJson({
				adapterId: bundle.adapterId,
				artifacts: bundle.artifacts.map((artifact: AdapterArtifact) => ({
					kind: artifact.kind,
					path: artifact.path,
					sourceRecordIds: artifact.sourceRecordIds,
					surface: artifact.surface,
				})),
				diagnostics: bundle.diagnostics,
				surface: bundle.surface,
			})}\n`,
		);
	}

	return desiredFiles;
}

export function collectDesiredDiagnostics(
	graph: SourceGraph,
): readonly Diagnostic[] {
	return createAdapterRegistry()
		.renderAllBundles(graph)
		.flatMap((bundle) => bundle.diagnostics)
		.sort(compareDiagnostics);
}

function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
	return (
		left.code.localeCompare(right.code) ||
		(left.path ?? "").localeCompare(right.path ?? "") ||
		left.message.localeCompare(right.message)
	);
}
