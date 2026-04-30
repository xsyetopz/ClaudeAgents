import type { Diagnostic, SourceRecord, Surface } from "@openagentlayer/types";
import type { AdapterId } from "./identity";

export type AdapterArtifactKind =
	| "agent"
	| "skill"
	| "command"
	| "instruction"
	| "hook"
	| "config"
	| "plugin"
	| "installer-metadata"
	| "validation-metadata";

export type AdapterCapability = SourceRecord["kind"] | AdapterArtifactKind;

export type AdapterArtifactInstallMode =
	| "full-file"
	| "marked-text-block"
	| "structured-object";

export interface AdapterArtifact {
	readonly surface: Surface;
	readonly kind: AdapterArtifactKind;
	readonly path: string;
	readonly content: string;
	readonly sourceRecordIds: readonly string[];
	readonly installMode?: AdapterArtifactInstallMode;
	readonly managedBlockId?: string;
	readonly managedKeyPaths?: readonly string[];
}

export interface AdapterRenderResult {
	readonly artifacts: readonly AdapterArtifact[];
	readonly diagnostics: readonly Diagnostic[];
}

export interface AdapterBundle {
	readonly adapterId: AdapterId;
	readonly surface: Surface;
	readonly artifacts: readonly AdapterArtifact[];
	readonly diagnostics: readonly Diagnostic[];
}
