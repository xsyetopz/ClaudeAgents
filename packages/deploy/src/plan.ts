import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type Artifact, artifactHash } from "@openagentlayer/artifact";
import { createManifest } from "@openagentlayer/manifest";
import type { DeployChange, DeployPlan } from "./types";

export async function planDeploy(
	targetRoot: string,
	artifacts: Artifact[],
): Promise<DeployPlan> {
	const changes: DeployChange[] = [];
	for (const artifact of artifacts)
		changes.push(await planArtifact(targetRoot, artifact));
	return {
		targetRoot,
		changes,
		artifacts,
		manifest: createManifest(artifacts),
		backups: [],
	};
}

async function planArtifact(
	targetRoot: string,
	artifact: Artifact,
): Promise<DeployChange> {
	const target = join(targetRoot, artifact.path);
	try {
		const current = await readFile(target, "utf8");
		return {
			action:
				artifactHash(current) === artifactHash(artifact.content)
					? "skip"
					: "update",
			path: artifact.path,
			reason: reasonForExisting(artifact),
		};
	} catch {
		return {
			action: "write",
			path: artifact.path,
			reason: reasonForNew(artifact),
		};
	}
}

function reasonForExisting(artifact: Artifact): string {
	if (artifact.mode === "block") return "managed marked block";
	if (artifact.mode === "config") return "managed structured config";
	return "managed artifact";
}

function reasonForNew(artifact: Artifact): string {
	if (artifact.mode === "block") return "new marked block";
	if (artifact.mode === "config") return "new structured config";
	return "new managed artifact";
}
