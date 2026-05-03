import { homedir } from "node:os";
import { resolve } from "node:path";
import {
	cancel,
	confirm,
	intro,
	isCancel,
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

type InteractiveAction =
	| "preview"
	| "deploy"
	| "plugins"
	| "features"
	| "uninstall"
	| "check";
type InteractiveProvider = "all" | "codex" | "claude" | "opencode";
type ProviderSingle = Exclude<InteractiveProvider, "all">;
type Scope = "project" | "global";

export async function runInteractiveCommand(repoRoot: string): Promise<void> {
	if (!process.stdin.isTTY)
		throw new Error("Interactive mode requires a TTY. Pass a command instead.");
	intro("OpenAgentLayer");
	const action = await ask<InteractiveAction>(
		select({
			message: "Choose workflow",
			options: [
				{ value: "preview", label: "Preview", hint: "no writes" },
				{ value: "deploy", label: "Deploy", hint: "dry-run by default" },
				{ value: "plugins", label: "Plugins", hint: "sync provider plugins" },
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
				{ value: "check", label: "Check", hint: "validate source" },
			],
		}),
	);
	if (action === "check") {
		await runCheckCommand(repoRoot);
		outro("✓ Source graph valid");
		return;
	}
	if (action === "preview") await interactivePreview(repoRoot);
	else if (action === "deploy") await interactiveDeploy(repoRoot);
	else if (action === "plugins") await interactivePlugins(repoRoot);
	else if (action === "features") await interactiveFeatures();
	else await interactiveUninstall();
	outro("✓ Done");
}

async function interactivePreview(repoRoot: string): Promise<void> {
	const provider = await providerPrompt({ allowAll: true });
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await homePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Include artifact contents?", initialValue: false }),
		)
	)
		args.push("--content");
	await runPreviewCommand(repoRoot, args);
}

async function interactiveDeploy(repoRoot: string): Promise<void> {
	const provider = await providerPrompt({ allowAll: true });
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await homePrompt());
	else args.push("--target", await targetPrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runDeployCommand(repoRoot, args);
}

async function interactivePlugins(repoRoot: string): Promise<void> {
	const provider = await providerPrompt({ allowAll: true });
	const args = ["--provider", provider, "--home", await homePrompt()];
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runPluginsCommand(repoRoot, args);
}

async function interactiveUninstall(): Promise<void> {
	const provider = await providerPrompt({ allowAll: false });
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await homePrompt());
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

function providerPrompt(options: {
	allowAll: true;
}): Promise<InteractiveProvider>;
function providerPrompt(options: { allowAll: false }): Promise<ProviderSingle>;
function providerPrompt(options: {
	allowAll: boolean;
}): Promise<InteractiveProvider> {
	return ask<InteractiveProvider>(
		select({
			message: "Provider",
			options: [
				...(options.allowAll
					? [{ value: "all" as const, label: "All providers" }]
					: []),
				{ value: "codex", label: "Codex" },
				{ value: "claude", label: "Claude Code" },
				{ value: "opencode", label: "OpenCode" },
			],
		}),
	);
}

function scopePrompt(): Promise<Scope> {
	return ask<Scope>(
		select({
			message: "Scope",
			options: [
				{ value: "project", label: "Project", hint: "write into one repo" },
				{
					value: "global",
					label: "Global",
					hint: "write provider home config",
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

async function ask<T>(prompt: Promise<unknown>): Promise<T> {
	const answer = await prompt;
	if (isCancel(answer)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return answer as T;
}
