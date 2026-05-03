import { homedir } from "node:os";
import { resolve } from "node:path";
import type { Artifact } from "@openagentlayer/artifact";
import { type DeployScope, globalArtifacts } from "@openagentlayer/deploy";
import { option, required, scopeOption } from "./arguments";

export interface ScopeContext {
	scope: DeployScope;
	targetRoot: string;
	manifestRoot: string;
}

export function scopeContext(
	args: string[],
	options: { requireTarget?: boolean } = {},
): ScopeContext {
	const scope = scopeOption(option(args, "--scope") ?? "project");
	if (scope === "global") {
		const home = resolve(option(args, "--home") ?? homedir());
		return { scope, targetRoot: home, manifestRoot: home };
	}
	const target = options.requireTarget
		? required(args, "--target")
		: (option(args, "--target") ?? ".");
	const targetRoot = resolve(target);
	return { scope, targetRoot, manifestRoot: targetRoot };
}

export function scopeArtifacts(
	context: ScopeContext,
	artifacts: readonly Artifact[],
): Artifact[] {
	if (context.scope === "global")
		return globalArtifacts(context.targetRoot, artifacts);
	return [...artifacts];
}
