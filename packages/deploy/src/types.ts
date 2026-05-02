import type { Artifact } from "@openagentlayer/artifact";
import type { Manifest } from "@openagentlayer/manifest";

export interface DeployChange {
	action: "write" | "update" | "remove" | "skip" | "backup";
	path: string;
	reason: string;
}

export interface DeployPlan {
	targetRoot: string;
	changes: DeployChange[];
	artifacts: Artifact[];
	manifest: Manifest;
	backups: string[];
}
