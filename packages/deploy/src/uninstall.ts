import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { artifactHash } from "@openagentlayer/artifact";
import { type Manifest, manifestPath } from "@openagentlayer/manifest";
import type { Provider } from "@openagentlayer/source";
import { removeManagedConfig, removeMarkedBlock } from "./merge";
import type { DeployChange, DeployScope } from "./types";

export interface UninstallOptions {
	scope?: DeployScope;
	manifestRoot?: string;
}

export async function uninstall(
	targetRoot: string,
	provider: Provider,
	options: UninstallOptions = {},
): Promise<DeployChange[]> {
	const scope = options.scope ?? "project";
	const manifestFile = join(
		options.manifestRoot ?? targetRoot,
		manifestPath(provider, scope),
	);
	const manifest = JSON.parse(await readFile(manifestFile, "utf8")) as Manifest;
	const changes: DeployChange[] = [];
	for (const entry of manifest.entries) {
		const target = join(targetRoot, entry.path);
		try {
			const current = await readFile(target, "utf8");
			if (entry.mode === "block" && entry.blockMarker) {
				const next = removeMarkedBlock(current, entry.blockMarker);
				if (next.trim().length === 0) {
					await rm(target);
					changes.push({
						action: "remove",
						path: entry.path,
						reason: "removed owned marked block",
					});
				} else {
					await writeFile(target, next);
					changes.push({
						action: "update",
						path: entry.path,
						reason: "removed owned marked block",
					});
				}
			} else if (artifactHash(current) === entry.hash) {
				await rm(target);
				changes.push({
					action: "remove",
					path: entry.path,
					reason: "owned hash matched",
				});
			} else if (entry.mode === "config") {
				await writeFile(
					target,
					removeManagedConfig(current, entry.path, entry.structuredKeys),
				);
				changes.push({
					action: "update",
					path: entry.path,
					reason: "removed owned structured config keys",
				});
			} else
				changes.push({
					action: "skip",
					path: entry.path,
					reason: "user modified managed file",
				});
		} catch {
			changes.push({
				action: "skip",
				path: entry.path,
				reason: "already absent",
			});
		}
	}
	await rm(manifestFile);
	return changes;
}
