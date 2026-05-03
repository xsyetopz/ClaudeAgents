import {
	type Artifact,
	artifactHash,
	managedBlockMarker,
} from "@openagentlayer/artifact";
import type { Provider } from "@openagentlayer/source";
export type ManifestScope = "project" | "global";
export interface ManifestEntry {
	provider: Provider;
	scope: ManifestScope;
	path: string;
	mode: "file" | "block" | "config";
	hash: string;
	sourceId: string;
	executable: boolean;
	structuredKeys: string[];
	blockMarker?: string;
}
export interface Manifest {
	product: "OpenAgentLayer";
	version: 1;
	oalVersion: string;
	entries: ManifestEntry[];
}
export function createManifest(
	artifacts: Artifact[],
	scope: ManifestScope = "project",
): Manifest {
	return {
		product: "OpenAgentLayer",
		version: 1,
		oalVersion: "0.0.0",
		entries: artifacts.map((artifact) => {
			const entry: ManifestEntry = {
				provider: artifact.provider,
				scope,
				path: artifact.path,
				mode: artifact.mode,
				hash: artifactHash(artifact.content),
				sourceId: artifact.sourceId,
				executable: artifact.executable === true,
				structuredKeys: artifact.mode === "config" ? configKeys(artifact) : [],
			};
			if (artifact.mode === "block") entry.blockMarker = blockMarker(artifact);
			return entry;
		}),
	};
}
function configKeys(artifact: Artifact): string[] {
	if (artifact.path.endsWith(".toml"))
		return [
			"profiles.openagentlayer",
			"profiles.openagentlayer-implement",
			"profiles.openagentlayer-utility",
			"agents",
		];
	try {
		return Object.keys(JSON.parse(stripJsonComments(artifact.content)));
	} catch {
		return [artifact.path];
	}
}

function blockMarker(artifact: Artifact): string {
	return managedBlockMarker(artifact);
}

export function manifestPath(
	provider: Provider,
	scope: ManifestScope = "project",
): string {
	if (scope === "global")
		return `.openagentlayer/manifest/global/${provider}.json`;
	return `.oal/manifest/${provider}.json`;
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
