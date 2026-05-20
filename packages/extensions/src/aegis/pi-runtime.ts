import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	appendAuditEvent,
	hashFile,
	hashJson,
	type ManifestFileRecord,
	type PiPackageSettingsEntry,
	readEnabledMemoryText,
	readManifest,
	readPiSettings,
	relativeToProject,
	removePackageEntry,
	upsertPackageEntry,
	writeManifest,
	writePiSettings,
} from "lifecycle";
import type {
	OlympiHookPipelineResult,
	PolicyDecision,
	PolicyEvent,
	PolicyEventType,
} from "safety";
import {
	classifyWorkspaceCommand,
	decidePolicy,
	planRtkRoute,
	rtkAntiBypassHook,
	rtkMissingExecutableBlocker,
	runHookPipeline,
} from "safety";

export const AEGIS_PI_RUNTIME_EVENTS: PolicyEventType[] = [
	"tool_call",
	"tool_result",
	"tool_execution_start",
	"tool_execution_end",
	"before_provider_request",
	"after_provider_response",
	"input",
	"before_agent_start",
	"agent_end",
	"turn_end",
	"message_end",
	"user_bash",
	"context",
	"session_start",
	"session_before_compact",
	"session_compact",
	"session_shutdown",
	"resources_discover",
	"model_select",
	"thinking_level_select",
];

export const OLYMPI_PI_SLASH_COMMANDS = [
	"olympi-goal",
	"olympi-plan",
	"olympi-execute",
	"olympi-complete",
	"olympi-resume",
	"olympi-handoff",
	"olympi-doctor",
	"olympi-status",
	"olympi-feedback",
	"olympi-context",
	"olympi-hooks",
	"olympi-skills",
] as const;

export const OLYMPI_PI_SKILLS = [
	"olympi-goal-loop",
	"olympi-code-intelligence",
	"olympi-debugging",
	"olympi-verification",
	"olympi-handoff",
	"olympi-caveman-output",
] as const;

export const OLYMPI_PI_PROMPTS = [
	"olympi-goal",
	"olympi-plan",
	"olympi-debug",
	"olympi-verify",
	"olympi-handoff",
	"olympi-caveman",
] as const;

const OLYMPI_CORE_PACKAGE_ID = "olympi-core";
const OLYMPI_CORE_SETTINGS_SOURCE = "./olympi/core/package";

export interface PiExtensionApiLike {
	on(
		event: string,
		handler: (event: unknown, ctx: PiContextLike) => unknown,
	): void;
	registerTool?(tool: unknown): void;
	registerCommand?(
		name: string,
		options: {
			description: string;
			handler: (args: string, ctx: PiContextLike) => unknown;
		},
	): void;
}

export interface PiContextLike {
	hasUI?: boolean;
	cwd?: string;
	sendUserMessage?(message: string, options?: Record<string, unknown>): unknown;
	sendMessage?(message: unknown, options?: Record<string, unknown>): unknown;
	ui?: {
		notify?(message: string, type?: "info" | "warning" | "error"): void;
		setStatus?(key: string, text: string | undefined): void;
	};
	getContextUsage?():
		| { tokens: number | null; contextWindow: number; percent: number | null }
		| undefined;
}

export interface AegisPiRuntimeStatus {
	schemaVersion: 1;
	command: "hooks aegis-runtime";
	runtimeExecutionEnabled: true;
	extensionEntrypoint: string;
	subscribedEvents: PolicyEventType[];
	failClosedEvents: PolicyEventType[];
	thirdPartyCodeExecution: false;
	writes: [];
	piApiSource: string;
	piInvocation: "project-extension-global-extension-or-explicit-e";
	globalPiInstall: "explicit-global-only";
	warnings: string[];
}

export type AegisInstallScope = "project-local" | "global";

export interface AegisInstallReport {
	schemaVersion: 1;
	command: "hooks aegis-install";
	scope: AegisInstallScope;
	projectRoot: string | null;
	targetStatePath: string;
	project: boolean;
	global: boolean;
	apply: boolean;
	blocked: boolean;
	wouldWrite: string[];
	written: string[];
	settingsTouched: string[];
	slashCommands: string[];
	skills: string[];
	prompts: string[];
	hooks: PolicyEventType[];
	toolShims: string[];
	entrypoint:
		| ".pi/extensions/olympi-aegis.ts"
		| "~/.pi/agent/extensions/olympi-aegis.ts";
	reason: string;
	warnings: string[];
	confirmationRequired: boolean;
	confirmed: boolean;
	provenance: string | null;
}

export interface AegisUninstallReport {
	schemaVersion: 1;
	command: "hooks aegis-uninstall";
	scope: AegisInstallScope;
	projectRoot: string | null;
	apply: boolean;
	blocked: boolean;
	wouldRead: string[];
	wouldRemove: string[];
	removed: string[];
	preserved: string[];
	reason: string;
	warnings: string[];
}

export function aegisPiRuntimeStatus(): AegisPiRuntimeStatus {
	return {
		schemaVersion: 1,
		command: "hooks aegis-runtime",
		runtimeExecutionEnabled: true,
		extensionEntrypoint: "packages/extensions/src/aegis/pi-runtime.ts",
		subscribedEvents: AEGIS_PI_RUNTIME_EVENTS,
		failClosedEvents: ["tool_call"],
		thirdPartyCodeExecution: false,
		writes: [],
		piApiSource:
			"@earendil-works/pi-coding-agent docs/extensions.md and dist/core/extensions/types.d.ts from the installed package",
		piInvocation: "project-extension-global-extension-or-explicit-e",
		globalPiInstall: "explicit-global-only",
		warnings: [
			"Load explicitly with pi -e ./packages/extensions/src/aegis/pi-runtime.ts for a one-off test, install the default project-local .pi/extensions/olympi-aegis.ts entrypoint, or explicitly install global Pi registration with --global.",
			"A package-manager global olympi binary is CLI-only and is not the same as olympi install --global Pi registration.",
			`Pi slash commands are registered by the extension: ${OLYMPI_PI_SLASH_COMMANDS.map((command) => `/${command}`).join(", ")}.`,
			"The live hook blocks via Pi's tool_call block contract, including RTK anti-bypass enforcement, and otherwise records warnings/status without executing package code.",
		],
	};
}

export async function installAegisPiExtension(options: {
	scope?: AegisInstallScope;
	projectRoot?: string;
	homeDir?: string;
	apply: boolean;
	confirmed?: boolean;
	provenance?: string;
}): Promise<AegisInstallReport> {
	const scope = options.scope ?? "project-local";
	const projectRoot =
		scope === "project-local"
			? path.resolve(options.projectRoot ?? process.cwd())
			: null;
	const homeDir = path.resolve(
		options.homeDir ?? process.env["HOME"] ?? os.homedir(),
	);
	const entrypoint =
		scope === "project-local"
			? (".pi/extensions/olympi-aegis.ts" as const)
			: ("~/.pi/agent/extensions/olympi-aegis.ts" as const);
	const targetStatePath =
		scope === "project-local"
			? path.join(projectRoot ?? process.cwd(), ".pi")
			: path.join(homeDir, ".pi", "agent");
	const target =
		scope === "project-local"
			? path.join(
					projectRoot ?? process.cwd(),
					".pi",
					"extensions",
					"olympi-aegis.ts",
				)
			: path.join(targetStatePath, "extensions", "olympi-aegis.ts");
	const corePlan =
		scope === "project-local" && projectRoot !== null
			? coreResourcePlan(projectRoot)
			: null;
	const wouldWrite = [entrypoint, ...(corePlan?.wouldWrite ?? [])].sort();
	const globalConfirmationRequired = scope === "global" && options.apply;
	const confirmed = options.confirmed === true;
	const provenance = options.provenance ?? null;
	if (
		globalConfirmationRequired &&
		(!confirmed || provenance !== "explicit-user-approval")
	) {
		return aegisInstallReport({
			scope,
			projectRoot,
			targetStatePath,
			apply: options.apply,
			blocked: true,
			wouldWrite,
			written: [],
			entrypoint,
			reason:
				"global Pi install blocked: rerun with --global --confirm-global --provenance explicit-user-approval after reviewing dry-run output",
			warnings: [
				"global Pi registration affects all Pi projects for this user",
				"package-manager global CLI installation is separate and does not satisfy this confirmation gate",
			],
			confirmationRequired: true,
			confirmed,
			provenance,
		});
	}
	if (!options.apply) {
		return aegisInstallReport({
			scope,
			projectRoot,
			targetStatePath,
			apply: false,
			blocked: false,
			wouldWrite,
			written: [],
			entrypoint,
			reason:
				scope === "project-local"
					? "dry-run plan for default project-local Aegis extension registration; rerun with --apply to write project .pi/extensions"
					: "dry-run plan for explicit global Aegis extension registration; rerun with --global --apply --confirm-global --provenance explicit-user-approval to write ~/.pi/agent/extensions",
			warnings:
				scope === "global"
					? [
							"global Pi registration is explicit and requires confirmation on apply",
						]
					: [],
			confirmationRequired: scope === "global",
			confirmed,
			provenance,
		});
	}
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, aegisProjectExtensionSource());
	if (corePlan !== null) await writeCoreResources(corePlan);
	return aegisInstallReport({
		scope,
		projectRoot,
		targetStatePath,
		apply: true,
		blocked: false,
		wouldWrite: [],
		written: wouldWrite,
		entrypoint,
		reason:
			scope === "project-local"
				? "installed default project-local Aegis extension entrypoint, slash commands, skills, prompts, hooks, and RTK tool-shim metadata; use Pi /reload or restart to load it"
				: "installed explicit global Aegis extension entrypoint for Pi; use Pi /reload or restart to load it globally",
		warnings: [],
		confirmationRequired: scope === "global",
		confirmed,
		provenance,
	});
}

export function installAegisProjectExtension(options: {
	projectRoot?: string;
	apply: boolean;
}): Promise<AegisInstallReport> {
	return installAegisPiExtension({
		scope: "project-local",
		apply: options.apply,
		...(options.projectRoot === undefined
			? {}
			: { projectRoot: options.projectRoot }),
	});
}

export async function uninstallAegisPiExtension(options: {
	scope?: AegisInstallScope;
	projectRoot?: string;
	apply: boolean;
}): Promise<AegisUninstallReport> {
	const scope = options.scope ?? "project-local";
	if (scope === "global") {
		return {
			schemaVersion: 1,
			command: "hooks aegis-uninstall",
			scope,
			projectRoot: null,
			apply: options.apply,
			blocked: true,
			wouldRead: [],
			wouldRemove: [],
			removed: [],
			preserved: [],
			reason:
				"global Olympi uninstall requires a dedicated explicit global provenance gate; project-local uninstall is the default",
			warnings: ["global ~/.pi removals are not implicit"],
		};
	}
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const manifest = await readManifest(projectRoot);
	const record = manifest.packages.find(
		(candidate) => candidate.packageId === OLYMPI_CORE_PACKAGE_ID,
	);
	if (record === undefined) {
		return {
			schemaVersion: 1,
			command: "hooks aegis-uninstall",
			scope,
			projectRoot,
			apply: options.apply,
			blocked: true,
			wouldRead: [".pi/olympi/olympi-manifest.json"],
			wouldRemove: [],
			removed: [],
			preserved: [],
			reason:
				"uninstall blocked: Olympi core manifest record is absent; refusing ambiguous deletes",
			warnings: [],
		};
	}
	const wouldRemove = [
		".pi/settings.json packages entry",
		...record.files.map((file) => file.path),
	].filter((value, index, all) => all.indexOf(value) === index);
	if (!options.apply) {
		return {
			schemaVersion: 1,
			command: "hooks aegis-uninstall",
			scope,
			projectRoot,
			apply: false,
			blocked: false,
			wouldRead: [".pi/olympi/olympi-manifest.json", ".pi/settings.json"],
			wouldRemove,
			removed: [],
			preserved: [],
			reason:
				"dry-run uninstall plan for manifest-owned Olympi Pi resources; rerun with --apply to remove matching files",
			warnings: [],
		};
	}
	const removed: string[] = [];
	const preserved: string[] = [];
	for (const file of record.files) {
		const absolute = path.join(projectRoot, file.path);
		if ((await safeHash(absolute)) !== file.hash) {
			preserved.push(file.path);
			continue;
		}
		await rm(absolute, { force: true });
		removed.push(file.path);
	}
	const settings = await readPiSettings(projectRoot);
	await writePiSettings(
		projectRoot,
		removePackageEntry(settings, record.settingsSource),
	);
	removed.push(".pi/settings.json packages entry");
	await writeManifest(projectRoot, {
		schemaVersion: 1,
		packages: manifest.packages.filter(
			(candidate) => candidate.packageId !== OLYMPI_CORE_PACKAGE_ID,
		),
	});
	await appendAuditEvent(projectRoot, {
		event: "olympi-core-uninstall",
		packageId: OLYMPI_CORE_PACKAGE_ID,
		ok: preserved.length === 0,
		detail:
			preserved.length === 0
				? "removed manifest-owned Olympi Pi resources"
				: "partial uninstall; preserved changed Olympi resource files",
	});
	return {
		schemaVersion: 1,
		command: "hooks aegis-uninstall",
		scope,
		projectRoot,
		apply: true,
		blocked: false,
		wouldRead: [".pi/olympi/olympi-manifest.json", ".pi/settings.json"],
		wouldRemove: [],
		removed: removed.sort(),
		preserved: preserved.sort(),
		reason:
			preserved.length === 0
				? "removed manifest-owned Olympi Pi resources"
				: "partial uninstall; preserved changed files for manual review",
		warnings: [],
	};
}

async function safeHash(filePath: string): Promise<string | null> {
	try {
		return await hashFile(filePath);
	} catch {
		return null;
	}
}

interface CoreResourcePlan {
	projectRoot: string;
	packageRoot: string;
	settingsEntry: PiPackageSettingsEntry;
	files: Array<{ relativePath: string; content: string }>;
	wouldWrite: string[];
}

function coreResourcePlan(projectRoot: string): CoreResourcePlan {
	const packageRoot = path.join(
		projectRoot,
		".pi",
		"olympi",
		"core",
		"package",
	);
	const settingsEntry: PiPackageSettingsEntry = {
		source: OLYMPI_CORE_SETTINGS_SOURCE,
		extensions: [],
		skills: ["+skills"],
		prompts: ["+prompts"],
		themes: [],
	};
	const files = coreResourceFiles();
	return {
		projectRoot,
		packageRoot,
		settingsEntry,
		files,
		wouldWrite: [
			".pi/settings.json packages entry",
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/audit.jsonl",
			...files.map((file) =>
				relativeToProject(
					projectRoot,
					path.join(packageRoot, file.relativePath),
				),
			),
		].sort(),
	};
}

async function writeCoreResources(plan: CoreResourcePlan): Promise<void> {
	for (const file of plan.files) {
		const target = path.join(plan.packageRoot, file.relativePath);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, file.content);
	}
	await writePiSettings(
		plan.projectRoot,
		upsertPackageEntry(
			await readPiSettings(plan.projectRoot),
			plan.settingsEntry,
		),
	);
	const manifestFiles: ManifestFileRecord[] = [];
	for (const file of plan.files) {
		const target = path.join(plan.packageRoot, file.relativePath);
		manifestFiles.push({
			path: relativeToProject(plan.projectRoot, target),
			hash: await hashFile(target),
		});
	}
	manifestFiles.push({
		path: ".pi/settings.json",
		hash: await hashFile(path.join(plan.projectRoot, ".pi", "settings.json")),
	});
	manifestFiles.push({
		path: ".pi/extensions/olympi-aegis.ts",
		hash: await hashFile(
			path.join(plan.projectRoot, ".pi", "extensions", "olympi-aegis.ts"),
		),
	});
	const contentDigest = hashJson(
		plan.files.map((file) => [file.relativePath, file.content]),
	);
	const manifest = await readManifest(plan.projectRoot);
	await writeManifest(plan.projectRoot, {
		schemaVersion: 1,
		packages: [
			...manifest.packages.filter(
				(record) => record.packageId !== OLYMPI_CORE_PACKAGE_ID,
			),
			{
				packageId: OLYMPI_CORE_PACKAGE_ID,
				installedAt: new Date().toISOString(),
				source: "first-party:olympi-core",
				package: {
					name: OLYMPI_CORE_PACKAGE_ID,
					version: "0.1.0",
					sourceType: "local",
					source: "first-party:olympi-core",
					contentDigest,
				},
				mirrorRoot: relativeToProject(plan.projectRoot, plan.packageRoot),
				settingsSource: plan.settingsEntry.source,
				settingsEntryHash: hashJson(plan.settingsEntry),
				resources: coreManifestResources(contentDigest),
				files: manifestFiles.sort((left, right) =>
					left.path.localeCompare(right.path),
				),
			},
		],
	});
	await appendAuditEvent(plan.projectRoot, {
		event: "olympi-core-install",
		packageId: OLYMPI_CORE_PACKAGE_ID,
		source: "first-party:olympi-core",
		ok: true,
		detail:
			"installed Olympi Pi slash commands, skills, prompts, hooks, and RTK tool-shim metadata project-locally",
	});
}

function coreResourceFiles(): Array<{ relativePath: string; content: string }> {
	return [
		{
			relativePath: "package.json",
			content: stableJson({
				name: OLYMPI_CORE_PACKAGE_ID,
				version: "0.1.0",
				private: true,
				pi: { skills: ["skills"], prompts: ["prompts"] },
			}),
		},
		{
			relativePath: "olympi-runtime.json",
			content: stableJson({
				schemaVersion: 1,
				slashCommands: OLYMPI_PI_SLASH_COMMANDS.map((command) => `/${command}`),
				skills: OLYMPI_PI_SKILLS.map((skill) => `/skill:${skill}`),
				prompts: OLYMPI_PI_PROMPTS.map((prompt) => `/${prompt}`),
				hooks: AEGIS_PI_RUNTIME_EVENTS,
				hookRoles: {
					preTool: ["tool_call", "tool_execution_start", "user_bash"],
					postTool: ["tool_result", "tool_execution_end"],
					preWrite: ["tool_call"],
					postWrite: ["tool_result", "message_end"],
					preCommit: ["tool_call", "user_bash"],
					postCommit: ["tool_result", "tool_execution_end"],
					stopBlocker: ["message_end", "agent_end", "turn_end"],
					validation: ["before_agent_start", "agent_end", "turn_end"],
					provenance: ["resources_discover", "tool_call", "message_end"],
					rtkAntiBypass: ["tool_call", "user_bash"],
					cavemanOutput: ["message_end", "session_before_compact"],
				},
				toolShims: ["bash->rtk-route", "unsupported-command->rtk proxy"],
				cavemanMode: "hook-skill-output-contract",
			}),
		},
		...OLYMPI_PI_SKILLS.map((skill) => ({
			relativePath: `skills/${skill}/SKILL.md`,
			content: skillMarkdown(skill),
		})),
		...OLYMPI_PI_PROMPTS.map((prompt) => ({
			relativePath: `prompts/${prompt}.md`,
			content: promptMarkdown(prompt),
		})),
		{
			relativePath: "shims/rtk-tool-shims.json",
			content: stableJson({
				schemaVersion: 1,
				behavior:
					"Pi bash/tool execution is governed by Aegis: supported commands route to RTK equivalents and unsupported commands proxy through RTK.",
				publicCommand: false,
			}),
		},
	];
}

function coreManifestResources(contentDigest: string) {
	return [
		...OLYMPI_PI_SKILLS.map((skill) => ({
			id: `skill:${skill}`,
			kind: "skill" as const,
			path: `skills/${skill}/SKILL.md`,
			hash: contentDigest,
		})),
		...OLYMPI_PI_PROMPTS.map((prompt) => ({
			id: `prompt:${prompt}`,
			kind: "prompt" as const,
			path: `prompts/${prompt}.md`,
			hash: contentDigest,
		})),
	];
}

function stableJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function skillMarkdown(skill: string): string {
	const description = skillDescription(skill);
	return `---
name: ${skill}
description: ${JSON.stringify(description)}
---
# ${skill}

${description}

Load this skill only for the matching Olympi slash workflow. Preserve project-local provenance, RTK routing, hook blockers, and verification evidence.
`;
}

function promptMarkdown(prompt: string): string {
	return `---
description: ${JSON.stringify(promptDescription(prompt))}
---
# ${prompt}

Use this prompt template inside Pi after Olympi is installed. Route normal work through Olympi slash commands, scoped skills, hooks, and automatic RTK tool routing.

Arguments: $ARGUMENTS
`;
}

function promptDescription(prompt: string): string {
	switch (prompt) {
		case "olympi-goal":
			return "Create a governed Olympi goal inside Pi.";
		case "olympi-plan":
			return "Plan a bounded next step with code context and blockers.";
		case "olympi-debug":
			return "Debug a concrete failure with narrow reproduction evidence.";
		case "olympi-verify":
			return "Collect verification evidence before completion.";
		case "olympi-handoff":
			return "Prepare a compact continuation handoff.";
		case "olympi-caveman":
			return "Apply Caveman output compression while preserving technical tokens.";
		default:
			return "Olympi Pi prompt template.";
	}
}

function skillDescription(skill: string): string {
	switch (skill) {
		case "olympi-goal-loop":
			return "Plan, execute, review, and complete bounded goal workflows through Pi slash commands with verification gates.";
		case "olympi-code-intelligence":
			return "Build concise code context for Pi workflows without broad reads or fabricated LSP output.";
		case "olympi-debugging":
			return "Diagnose concrete failures by reproducing one variable at a time and preserving blockers.";
		case "olympi-verification":
			return "Collect exact validation evidence before completion or handoff.";
		case "olympi-handoff":
			return "Prepare compact continuation records and next Pi slash-command steps.";
		case "olympi-caveman-output":
			return "Compress prose when explicitly requested while preserving code, commands, paths, exact errors, versions, and validation evidence.";
		default:
			return "Olympi first-party Pi skill.";
	}
}

function aegisInstallReport(
	input: Omit<
		AegisInstallReport,
		| "schemaVersion"
		| "command"
		| "project"
		| "global"
		| "settingsTouched"
		| "slashCommands"
		| "skills"
		| "prompts"
		| "hooks"
		| "toolShims"
	>,
): AegisInstallReport {
	return {
		schemaVersion: 1,
		command: "hooks aegis-install",
		project: input.scope === "project-local",
		global: input.scope === "global",
		settingsTouched:
			input.scope === "project-local"
				? [".pi/settings.json packages entry"]
				: [],
		slashCommands: OLYMPI_PI_SLASH_COMMANDS.map((command) => `/${command}`),
		skills: OLYMPI_PI_SKILLS.map((skill) => `/skill:${skill}`),
		prompts: OLYMPI_PI_PROMPTS.map((prompt) => `/${prompt}`),
		hooks: AEGIS_PI_RUNTIME_EVENTS,
		toolShims: ["bash->rtk-route", "unsupported-command->rtk proxy"],
		...input,
	};
}

function aegisProjectExtensionSource(): string {
	const runtimeImport = pathToFileURL(fileURLToPath(import.meta.url)).href;
	return [
		`import { createAegisPiExtension } from ${JSON.stringify(runtimeImport)};`,
		'import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";',
		"",
		"export default function olympiAegis(pi: ExtensionAPI): void {",
		"\tcreateAegisPiExtension(pi);",
		"}",
		"",
	].join("\n");
}

export function createAegisPiExtension(pi: PiExtensionApiLike): void {
	for (const eventName of AEGIS_PI_RUNTIME_EVENTS) {
		pi.on(eventName, (event, ctx) => handleAegisEvent(eventName, event, ctx));
	}
	for (const command of OLYMPI_PI_SLASH_COMMANDS) {
		pi.registerCommand?.(command, {
			description: slashCommandDescription(command),
			handler: async (args, ctx) => {
				const prompt = await slashCommandPrompt(command, args);
				if (ctx.sendUserMessage !== undefined) {
					await ctx.sendUserMessage(prompt, { deliverAs: "steer" });
					return;
				}
				ctx.ui?.notify?.(prompt, "info");
			},
		});
	}
	pi.registerCommand?.("olympi-aegis-status", {
		description: "Show Olympi Aegis policy/runtime status",
		handler: (_args, ctx) => {
			const usage = ctx.getContextUsage?.();
			ctx.ui?.notify?.(
				`Aegis active; context ${usage?.percent?.toFixed(1) ?? "unknown"}%/${usage?.contextWindow ?? "unknown"}`,
				"info",
			);
		},
	});
}

function slashCommandDescription(command: string): string {
	switch (command) {
		case "olympi-goal":
			return "Start a governed Olympi goal workflow in Pi";
		case "olympi-plan":
			return "Plan a bounded Olympi goal step in Pi";
		case "olympi-execute":
			return "Execute a governed Olympi step through hooks and RTK";
		case "olympi-complete":
			return "Request verification-gated Olympi goal completion";
		case "olympi-resume":
			return "Resume a saved Olympi goal from project-local state";
		case "olympi-handoff":
			return "Prepare a compact Olympi handoff";
		case "olympi-doctor":
			return "Check Olympi/Pi runtime health";
		case "olympi-status":
			return "Summarize Olympi project state";
		case "olympi-feedback":
			return "Capture dogfood feedback for Olympi";
		case "olympi-context":
			return "Build concise code-intelligence context";
		case "olympi-hooks":
			return "Inspect active Olympi hook behavior";
		case "olympi-skills":
			return "Show scoped Olympi skills for this workflow";
		default:
			return "Olympi Pi workflow command";
	}
}

async function slashCommandPrompt(
	command: string,
	args: string,
): Promise<string> {
	const trimmedArgs = args.trim();
	const memory = await memoryPromptSuffix();
	switch (command) {
		case "olympi-goal":
			return `Use /skill:olympi-goal-loop. Create a governed Olympi goal from: ${trimmedArgs || "<ask for goal>"}. Keep state project-local, identify verification commands, stop on blockers, and route tool execution through RTK.${memory}`;
		case "olympi-plan":
			return `Use /skill:olympi-goal-loop and /skill:olympi-code-intelligence. Plan the next bounded Olympi step from: ${trimmedArgs || "<current goal>"}. Require explicit paths and parent review.${memory}`;
		case "olympi-execute":
			return `Use /skill:olympi-goal-loop. Execute only the requested bounded step after policy, provenance, hook, and RTK checks: ${trimmedArgs || "<step and command required>"}. Stop on missing RTK or ownership proof.${memory}`;
		case "olympi-complete":
			return `Use /skill:olympi-verification. Check completion evidence for: ${trimmedArgs || "<goal>"}. Require passing verification, no unresolved blockers, and explicit audit evidence.${memory}`;
		case "olympi-resume":
			return `Use /skill:olympi-goal-loop and /skill:olympi-handoff. Resume the saved goal from project-local state without clearing blockers: ${trimmedArgs || "<goal-id>"}.${memory}`;
		case "olympi-handoff":
			return `Use /skill:olympi-handoff. Produce a compact continuation record with objective, done, next Pi slash command, validation evidence, and blockers. ${trimmedArgs}${memory}`;
		case "olympi-doctor":
			return `Run the Olympi doctor health path through the installed extension context: report Pi registration, RTK availability, hook status, slash resources, skills, prompts, and project-local state.${memory}`;
		case "olympi-status":
			return `Summarize Olympi project-local state, manifest/lock/audit drift, active blockers, installed slash resources, hooks, skills, prompts, and RTK status.${memory}`;
		case "olympi-feedback":
			return `Capture concrete Olympi dogfood feedback with source, problem, evidence, affected path, and classification: ${trimmedArgs || "<feedback>"}.${memory}`;
		case "olympi-context":
			return `Use /skill:olympi-code-intelligence. Build bounded code context for: ${trimmedArgs || "current task"}. Prefer narrow files and repo-map hints.${memory}`;
		case "olympi-hooks":
			return `Explain active Olympi runtime hooks: pre-tool, post-tool, write, commit-adjacent, stop/blocker, validation, provenance, RTK anti-bypass, and Caveman output.${memory}`;
		case "olympi-skills":
			return `List scoped Olympi skills and when to load them lazily for the current Pi workflow.${memory}`;
		default:
			return `${trimmedArgs}${memory}`.trim();
	}
}

async function memoryPromptSuffix(): Promise<string> {
	try {
		const memory = await readEnabledMemoryText();
		if (memory.length === 0) return "";
		return `\n\nProject memory:\n${memory.map((entry) => `- ${entry}`).join("\n")}`;
	} catch {
		return "";
	}
}

// biome-ignore lint/style/noDefaultExport: Pi extension entrypoints are default factory exports.
export default function aegisPiRuntime(pi: PiExtensionApiLike): void {
	createAegisPiExtension(pi);
}

export function handleAegisEvent(
	eventName: PolicyEventType,
	event: unknown,
	ctx: PiContextLike,
): unknown {
	const routed = routePiToolCommand(eventName, event);
	if (routed?.blocked === true) {
		ctx.ui?.setStatus?.("olympi-aegis", "Aegis block");
		return { block: true, reason: routed.reason };
	}
	const policyEvent = policyEventFromPi(eventName, event);
	const decision = decidePolicy(policyEvent);
	const rtkDecision = rtkDecisionFromPolicyEvent(policyEvent);
	recordDecision(decision, ctx);
	if (rtkDecision?.vetoed) {
		recordDecision(
			{
				schemaVersion: 1,
				module: "themis",
				eventType: policyEvent.eventType,
				subject: policyEvent.command ?? policyEvent.toolName ?? "rtk-route",
				decision: "block",
				blocked: true,
				reasons: rtkDecision.reasons,
				redactions: [],
				redactedText: null,
				requiredNextAction: rtkDecision.requiredNextAction,
				auditId: rtkDecision.digest,
			},
			ctx,
		);
	}
	if (eventName === "tool_call" && (decision.blocked || rtkDecision?.vetoed)) {
		return {
			block: true,
			reason: [...decision.reasons, ...(rtkDecision?.reasons ?? [])].join("; "),
		};
	}
	if (
		eventName === "tool_result" &&
		decision.redactedText !== null &&
		decision.redactedText !== undefined
	) {
		return { content: [{ type: "text", text: decision.redactedText }] };
	}
	return undefined;
}

function routePiToolCommand(
	eventName: PolicyEventType,
	event: unknown,
): { blocked: true; reason: string } | { blocked: false } | null {
	if (eventName !== "tool_call" && eventName !== "user_bash") return null;
	const record = asRecord(event);
	const input = asRecord(record["input"]);
	const command =
		stringValue(input["command"]) ?? stringValue(record["command"]);
	if (command === undefined) return null;
	const route = planRtkRoute(command);
	const missing = rtkMissingExecutableBlocker(route);
	if (missing !== null) {
		return {
			blocked: true,
			reason: `RTK route required but executable is unavailable; required route: ${missing.requiredRtkRoute}`,
		};
	}
	if (command === route.rtkCommandText) return { blocked: false };
	if (record["input"] && typeof record["input"] === "object") {
		(input as { command?: string }).command = route.rtkCommandText;
	} else {
		(record as { command?: string }).command = route.rtkCommandText;
	}
	return { blocked: false };
}

function rtkDecisionFromPolicyEvent(
	event: PolicyEvent,
): OlympiHookPipelineResult | null {
	if (event.eventType !== "tool_call" || event.operation !== "execute") {
		return null;
	}
	if (event.command === undefined) return null;
	const route = planRtkRoute(event.command);
	return runHookPipeline(
		{
			schemaVersion: 1,
			phase: "pre-action",
			operation: "execute",
			command: event.command,
			...(event.toolName === undefined ? {} : { toolName: event.toolName }),
			rtkRoute: {
				originalCommand: event.command,
				requiredRtkRoute: route.rtkCommandText,
				attemptedCommand: event.command,
				directExecution: event.command !== route.rtkCommandText,
			},
		},
		[rtkAntiBypassHook()],
	);
}

export function policyEventFromPi(
	eventName: PolicyEventType,
	event: unknown,
): PolicyEvent {
	const record = asRecord(event);
	switch (eventName) {
		case "tool_call": {
			const toolName = stringValue(record["toolName"]);
			const input = asRecord(record["input"]);
			const path = stringValue(input["path"]);
			const command = stringValue(input["command"]);
			const classified = classifyWorkspaceCommand(command);
			const manifestOwned = path?.startsWith(".pi/olympi/") ?? false;
			const classifiedManifestOwned =
				classified.paths.length > 0 &&
				classified.paths.every((entry) => entry.startsWith(".pi/olympi/"));
			const operation = operationForTool(toolName);
			const missingFields = missingProviderMetadataFields({
				operation,
				command,
				path,
				classifiedPaths: classified.paths,
				classificationRequiresOwnership: classified.requiresOwnershipProof,
			});
			return {
				schemaVersion: 1,
				eventType: "tool_call",
				...(toolName === undefined ? {} : { toolName }),
				...(operation === undefined ? {} : { operation }),
				...(command === undefined ? {} : { command }),
				...(path === undefined ? {} : { path }),
				generatedArtifact: toolName === "write" || toolName === "edit",
				manifestOwned: manifestOwned || classifiedManifestOwned,
				packageExecutable: toolName === "extension-load",
				providerMetadata: {
					source: "provider-event",
					missingFields,
					eventShape: eventShape(record),
					preventedOperation:
						operation ?? classified.operation ?? classified.primaryClass,
				},
				...(classified.operation === null
					? {}
					: {
							workspace: {
								operation: classified.operation,
								paths: classified.paths,
								proof:
									manifestOwned || classifiedManifestOwned
										? "manifest-hash"
										: "unknown",
								ambiguous: !(manifestOwned || classifiedManifestOwned),
							},
						}),
			};
		}
		case "tool_result": {
			const toolName = stringValue(record["toolName"]);
			const text = textContent(record["content"]);
			return {
				schemaVersion: 1,
				eventType: "tool_result",
				...(toolName === undefined ? {} : { toolName }),
				...(text === undefined ? {} : { text }),
			};
		}
		case "before_provider_request": {
			const text = safeJson(record["payload"]);
			return {
				schemaVersion: 1,
				eventType: "before_provider_request",
				payloadBytes: Buffer.byteLength(text),
				text,
			};
		}
		case "input": {
			const text = stringValue(record["text"]);
			return {
				schemaVersion: 1,
				eventType: "input",
				...(text === undefined ? {} : { text }),
			};
		}
		default:
			return { schemaVersion: 1, eventType: eventName };
	}
}

function missingProviderMetadataFields(options: {
	operation: PolicyEvent["operation"] | undefined;
	command: string | undefined;
	path: string | undefined;
	classifiedPaths: string[];
	classificationRequiresOwnership: boolean;
}): string[] {
	const missing = new Set<string>();
	if (options.operation === "execute" && options.command === undefined) {
		missing.add("command");
	}
	const pathSensitive =
		options.operation === "write" ||
		options.operation === "edit" ||
		options.operation === "delete" ||
		options.classificationRequiresOwnership;
	if (
		pathSensitive &&
		options.path === undefined &&
		options.classifiedPaths.length === 0
	) {
		missing.add("path");
	}
	return [...missing].sort();
}

function eventShape(record: Record<string, unknown>): string[] {
	const shape = new Set(Object.keys(record).sort());
	const input = asRecord(record["input"]);
	for (const key of Object.keys(input).sort()) shape.add(`input.${key}`);
	return [...shape].sort();
}

function recordDecision(decision: PolicyDecision, ctx: PiContextLike): void {
	if (decision.decision === "allow") return;
	ctx.ui?.setStatus?.("olympi-aegis", `Aegis ${decision.decision}`);
	if (ctx.hasUI === false) return;
	ctx.ui?.notify?.(
		`Olympi Aegis ${decision.decision}: ${decision.reasons[0] ?? decision.redactions[0] ?? "policy event"}`,
		decision.blocked ? "error" : "warning",
	);
}

function operationForTool(
	toolName: string | undefined,
): PolicyEvent["operation"] {
	switch (toolName) {
		case "bash":
			return "execute";
		case "write":
			return "write";
		case "edit":
			return "edit";
		case "read":
		case "grep":
		case "find":
		case "ls":
			return "read";
		case undefined:
			return undefined;
		default:
			return undefined;
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function textContent(value: unknown): string | undefined {
	if (!Array.isArray(value)) return undefined;
	const parts = value
		.map((entry) => asRecord(entry))
		.filter((entry) => entry["type"] === "text")
		.map((entry) => stringValue(entry["text"]))
		.filter((entry): entry is string => entry !== undefined);
	return parts.length === 0 ? undefined : parts.join("\n");
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return "[unserializable-provider-payload]";
	}
}
