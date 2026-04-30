import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { runCli } from "./cli";

export type CliSurface = "codex" | "claude" | "opencode" | "all";
export type CliScope = "global" | "project";

export async function createInstallTarget(): Promise<string> {
	return await createFixtureRoot();
}

export async function runInstall(options: {
	readonly scope: CliScope;
	readonly surface: CliSurface;
	readonly target?: string;
}) {
	return await runCli([
		"install",
		"--surface",
		options.surface,
		"--scope",
		options.scope,
		...(options.target === undefined ? [] : ["--target", options.target]),
		"--root",
		process.cwd(),
	]);
}

export async function runDoctor(options: {
	readonly scope: CliScope;
	readonly surface: CliSurface;
	readonly target: string;
}) {
	return await runCli([
		"doctor",
		"--surface",
		options.surface,
		"--scope",
		options.scope,
		"--target",
		options.target,
		"--root",
		process.cwd(),
	]);
}

export async function runUninstall(options: {
	readonly scope: CliScope;
	readonly surface: CliSurface;
	readonly target: string;
	readonly includeRoot?: boolean;
}) {
	return await runCli([
		"uninstall",
		"--surface",
		options.surface,
		"--scope",
		options.scope,
		"--target",
		options.target,
		...(options.includeRoot === true ? ["--root", process.cwd()] : []),
	]);
}

export async function manifestExists(
	targetRoot: string,
	surface: Exclude<CliSurface, "all">,
	scope: CliScope,
): Promise<boolean> {
	return await Bun.file(
		join(targetRoot, `.oal/manifest/${surface}-${scope}.json`),
	).exists();
}
