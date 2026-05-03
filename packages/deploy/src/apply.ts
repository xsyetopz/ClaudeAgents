import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { manifestPath } from "@openagentlayer/manifest";
import { createBackupIfNeeded } from "./backup";
import { mergedContent } from "./merge";
import type { DeployPlan } from "./types";

export async function applyDeploy(plan: DeployPlan): Promise<void> {
	for (const artifact of plan.artifacts) {
		const target = join(plan.targetRoot, artifact.path);
		await mkdir(dirname(target), { recursive: true });
		await createBackupIfNeeded(plan.targetRoot, artifact.path, target);
		await writeFile(target, await mergedContent(target, artifact));
		if (artifact.executable) await chmod(target, 0o755);
	}
	for (const provider of new Set(
		plan.artifacts.map((artifact) => artifact.provider),
	)) {
		const providerManifest = {
			...plan.manifest,
			entries: plan.manifest.entries.filter(
				(entry) => entry.provider === provider,
			),
		};
		const target = join(plan.manifestRoot, manifestPath(provider, plan.scope));
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, JSON.stringify(providerManifest, null, 2));
	}
}
