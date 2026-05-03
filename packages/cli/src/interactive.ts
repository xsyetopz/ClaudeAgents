import { homedir } from "node:os";
import { resolve } from "node:path";
import {
	cancel,
	confirm,
	intro,
	isCancel,
	log,
	multiselect,
	outro,
	select,
	text,
} from "@clack/prompts";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runFeaturesCommand } from "./commands/toolchain";
import { runUninstallCommand } from "./commands/uninstall";
import { cavemanModes } from "./source";

type InteractiveAction =
	| "preview"
	| "deploy"
	| "plugins"
	| "features"
	| "uninstall"
	| "check";
type InteractiveProvider = "all" | "codex" | "claude" | "opencode";
type ProviderSingle = Exclude<InteractiveProvider, "all">;
type ProviderMulti = ProviderSingle[];
type Scope = "project" | "global";

export async function runInteractiveCommand(repoRoot: string): Promise<void> {
	if (!process.stdin.isTTY)
		throw new Error("Interactive mode requires a TTY. Pass a command instead.");
	intro("OpenAgentLayer");
	for (;;) {
		const action = await workflowPrompt();
		if (action === "check") await runCheckCommand(repoRoot);
		else if (action === "preview") await interactivePreview(repoRoot);
		else if (action === "deploy") await interactiveDeploy(repoRoot);
		else if (action === "plugins") await interactivePlugins(repoRoot);
		else if (action === "features") await interactiveFeatures();
		else await interactiveUninstall();
		const again = await ask<boolean>(
			confirm({
				message: "Run another OAL workflow?",
				initialValue: true,
			}),
		);
		if (!again) break;
	}
	outro("✓ Done");
}

function workflowPrompt(): Promise<InteractiveAction> {
	return ask<InteractiveAction>(
		select({
			message: "Choose workflow",
			options: [
				{ value: "preview", label: "Preview", hint: "no writes" },
				{
					value: "deploy",
					label: "Deploy",
					hint: "render and merge managed artifacts",
				},
				{
					value: "plugins",
					label: "Plugins",
					hint: "sync provider plugin payloads",
				},
				{
					value: "features",
					label: "Features",
					hint: "optional tool commands",
				},
				{
					value: "uninstall",
					label: "Uninstall",
					hint: "remove OAL-owned files",
				},
				{ value: "check", label: "Check", hint: "validate source graph" },
			],
		}),
	);
}

async function interactivePreview(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Include artifact contents?", initialValue: false }),
		)
	)
		args.push("--content");
	await runPreviewCommand(repoRoot, args);
}

async function interactiveDeploy(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	else args.push("--target", await targetPrompt());
	appendCavemanMode(args, await cavemanModePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runDeployCommand(repoRoot, args);
}

async function interactivePlugins(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const args = ["--provider", provider, "--home", await globalHomePrompt()];
	appendCavemanMode(args, await cavemanModePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runPluginsCommand(repoRoot, args);
	log.success(`Plugin sync complete for ${provider}.`);
}

async function interactiveUninstall(): Promise<void> {
	const provider = await providerSinglePrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	else args.push("--target", await targetPrompt());
	await runUninstallCommand(args);
}

async function interactiveFeatures(): Promise<void> {
	const action = await ask<"install" | "remove">(
		select({
			message: "Feature action",
			options: [
				{ value: "install", label: "Install optional features" },
				{ value: "remove", label: "Remove optional features" },
			],
		}),
	);
	const feature = await ask<"ctx7" | "deepwiki" | "playwright">(
		select({
			message: "Feature",
			options: [
				{ value: "ctx7", label: "Context7 [CLI]" },
				{ value: "playwright", label: "Playwright [CLI]" },
				{ value: "deepwiki", label: "DeepWiki [MCP]" },
			],
		}),
	);
	runFeaturesCommand([`--${action}`, feature]);
}

function appendCavemanMode(args: string[], mode: string): void {
	if (mode !== "source") args.push("--caveman-mode", mode);
}

function cavemanModePrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "Caveman output mode",
			options: [
				{
					value: "source",
					label: "Source default",
					hint: "use source/product.json",
				},
				...cavemanModes.map((mode) => ({
					value: mode,
					label: mode,
				})),
			],
		}),
	);
}

async function providerPrompt(): Promise<string> {
	const providers = await ask<ProviderMulti>(
		multiselect({
			message: "Providers",
			required: true,
			options: [
				{ value: "codex", label: "Codex", hint: "AGENTS.md, TOML, hooks" },
				{
					value: "claude",
					label: "Claude Code",
					hint: "CLAUDE.md, settings, hooks",
				},
				{
					value: "opencode",
					label: "OpenCode",
					hint: "JSONC, plugins, tools",
				},
			],
		}),
	);
	return providers.length === 3 ? "all" : providers.join(",");
}

function providerSinglePrompt(): Promise<ProviderSingle> {
	return ask<ProviderSingle>(
		select({
			message: "Provider to remove",
			options: [
				{ value: "codex", label: "Codex", hint: "owned Codex artifacts" },
				{
					value: "claude",
					label: "Claude Code",
					hint: "owned Claude artifacts",
				},
				{
					value: "opencode",
					label: "OpenCode",
					hint: "owned OpenCode artifacts",
				},
			],
		}),
	);
}

function scopePrompt(): Promise<Scope> {
	return ask<Scope>(
		select({
			message: "Scope",
			options: [
				{ value: "project", label: "Project", hint: "target repository" },
				{
					value: "global",
					label: "Global",
					hint: "provider home plus oal shim",
				},
			],
		}),
	);
}

function targetPrompt(): Promise<string> {
	return ask<string>(
		text({
			message: "Project target",
			placeholder: process.cwd(),
			defaultValue: process.cwd(),
			validate: (value) => (value?.trim() ? undefined : "Target is required"),
		}),
	);
}

async function homePrompt(): Promise<string> {
	return resolve(
		await ask<string>(
			text({
				message: "Home directory",
				placeholder: homedir(),
				defaultValue: homedir(),
				validate: (value) => (value?.trim() ? undefined : "Home is required"),
			}),
		),
	);
}

async function globalHomePrompt(): Promise<string> {
	const detectedHome = resolve(homedir());
	const useDetectedHome = await ask<boolean>(
		confirm({
			message: `Use detected home ${detectedHome}?`,
			initialValue: true,
		}),
	);
	if (useDetectedHome) return detectedHome;
	return homePrompt();
}

async function ask<T>(prompt: Promise<unknown>): Promise<T> {
	const answer = await prompt;
	if (isCancel(answer)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return answer as T;
}
