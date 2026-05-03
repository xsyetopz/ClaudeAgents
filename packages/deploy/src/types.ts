import type { Artifact } from "@openagentlayer/artifact";
import type { Manifest, ManifestScope } from "@openagentlayer/manifest";

export type DeployScope = ManifestScope;

export interface DeployChange {
	action: "write" | "update" | "remove" | "skip" | "backup";
	path: string;
	reason: string;
}

export interface DeployPlan {
	targetRoot: string;
	manifestRoot: string;
	scope: DeployScope;
	changes: DeployChange[];
	artifacts: Artifact[];
	manifest: Manifest;
	backups: string[];
}
