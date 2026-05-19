import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PolicyDecision, PolicyEvent, PolicyEventType } from "safety";
import { decidePolicy } from "safety";

export const AEGIS_PI_RUNTIME_EVENTS: PolicyEventType[] = [
	"tool_call",
	"tool_result",
	"before_provider_request",
	"input",
	"session_start",
	"session_shutdown",
	"resources_discover",
	"model_select",
	"thinking_level_select",
];

export interface PiExtensionApiLike {
	on(
		event: string,
		handler: (event: unknown, ctx: PiContextLike) => unknown,
	): void;
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
	warnings: string[];
}

export interface AegisProjectInstallReport {
	schemaVersion: 1;
	command: "hooks aegis-install";
	projectRoot: string;
	project: true;
	apply: boolean;
	blocked: false;
	wouldWrite: string[];
	written: string[];
	entrypoint: ".pi/extensions/olympus-aegis.ts";
	reason: string;
	warnings: string[];
}

export function aegisPiRuntimeStatus(): AegisPiRuntimeStatus {
	return {
		schemaVersion: 1,
		command: "hooks aegis-runtime",
		runtimeExecutionEnabled: true,
		extensionEntrypoint:
			"packages/extensions/src/extensions/aegis/pi-runtime.ts",
		subscribedEvents: AEGIS_PI_RUNTIME_EVENTS,
		failClosedEvents: ["tool_call"],
		thirdPartyCodeExecution: false,
		writes: [],
		piApiSource:
			"@earendil-works/pi-coding-agent docs/extensions.md and dist/core/extensions/types.d.ts from the installed package",
		warnings: [
			"Load explicitly with pi -e ./packages/extensions/src/extensions/aegis/pi-runtime.ts; Olympus does not write global ~/.pi extension files.",
			"The live hook blocks only via Pi's tool_call block contract and otherwise records warnings/status without executing package code.",
		],
	};
}

export async function installAegisProjectExtension(options: {
	projectRoot?: string;
	apply: boolean;
}): Promise<AegisProjectInstallReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const entrypoint = ".pi/extensions/olympus-aegis.ts" as const;
	const target = path.join(projectRoot, entrypoint);
	const wouldWrite = [entrypoint];
	if (!options.apply) {
		return {
			schemaVersion: 1,
			command: "hooks aegis-install",
			projectRoot,
			project: true,
			apply: false,
			blocked: false,
			wouldWrite,
			written: [],
			entrypoint,
			reason:
				"dry-run plan for project-local Aegis extension copy; rerun with --apply to write .pi/extensions only",
			warnings: [],
		};
	}
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, aegisProjectExtensionSource());
	return {
		schemaVersion: 1,
		command: "hooks aegis-install",
		projectRoot,
		project: true,
		apply: true,
		blocked: false,
		wouldWrite: [],
		written: wouldWrite,
		entrypoint,
		reason:
			"installed project-local Aegis extension entrypoint; use Pi /reload or restart to load it",
		warnings: [],
	};
}

function aegisProjectExtensionSource(): string {
	return [
		'import { createAegisPiExtension } from "extensions";',
		'import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";',
		"",
		"export default function olympusAegis(pi: ExtensionAPI): void {",
		"\tcreateAegisPiExtension(pi);",
		"}",
		"",
	].join("\n");
}

export function createAegisPiExtension(pi: PiExtensionApiLike): void {
	for (const eventName of AEGIS_PI_RUNTIME_EVENTS) {
		pi.on(eventName, (event, ctx) => handleAegisEvent(eventName, event, ctx));
	}
	pi.registerCommand?.("olympus-aegis-status", {
		description: "Show Olympus Aegis policy/runtime status",
		handler: (_args, ctx) => {
			const usage = ctx.getContextUsage?.();
			ctx.ui?.notify?.(
				`Aegis active; context ${usage?.percent?.toFixed(1) ?? "unknown"}%/${usage?.contextWindow ?? "unknown"}`,
				"info",
			);
		},
	});
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
	const policyEvent = policyEventFromPi(eventName, event);
	const decision = decidePolicy(policyEvent);
	recordDecision(decision, ctx);
	if (eventName === "tool_call" && decision.blocked) {
		return { block: true, reason: decision.reasons.join("; ") };
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

export function policyEventFromPi(
	eventName: PolicyEventType,
	event: unknown,
): PolicyEvent {
	const record = asRecord(event);
	if (eventName === "tool_call") {
		const toolName = stringValue(record["toolName"]);
		const input = asRecord(record["input"]);
		const path = stringValue(input["path"]);
		const command = stringValue(input["command"]);
		const operation = operationForTool(toolName);
		return {
			schemaVersion: 1,
			eventType: "tool_call",
			...(toolName === undefined ? {} : { toolName }),
			...(operation === undefined ? {} : { operation }),
			...(command === undefined ? {} : { command }),
			...(path === undefined ? {} : { path }),
			generatedArtifact: toolName === "write" || toolName === "edit",
			manifestOwned: path?.startsWith(".pi/olympus/") ?? false,
			packageExecutable: toolName === "extension-load",
		};
	}
	if (eventName === "tool_result") {
		const toolName = stringValue(record["toolName"]);
		const text = textContent(record["content"]);
		return {
			schemaVersion: 1,
			eventType: "tool_result",
			...(toolName === undefined ? {} : { toolName }),
			...(text === undefined ? {} : { text }),
		};
	}
	if (eventName === "before_provider_request") {
		const text = safeJson(record["payload"]);
		return {
			schemaVersion: 1,
			eventType: "before_provider_request",
			payloadBytes: Buffer.byteLength(text),
			text,
		};
	}
	if (eventName === "input") {
		const text = stringValue(record["text"]);
		return {
			schemaVersion: 1,
			eventType: "input",
			...(text === undefined ? {} : { text }),
		};
	}
	return { schemaVersion: 1, eventType: eventName };
}

function recordDecision(decision: PolicyDecision, ctx: PiContextLike): void {
	if (decision.decision === "allow") return;
	ctx.ui?.setStatus?.("olympus-aegis", `Aegis ${decision.decision}`);
	if (ctx.hasUI === false) return;
	ctx.ui?.notify?.(
		`Olympus Aegis ${decision.decision}: ${decision.reasons[0] ?? decision.redactions[0] ?? "policy event"}`,
		decision.blocked ? "error" : "warning",
	);
}

function operationForTool(
	toolName: string | undefined,
): PolicyEvent["operation"] {
	if (toolName === "bash") return "execute";
	if (toolName === "write") return "write";
	if (toolName === "edit") return "edit";
	if (
		toolName === "read" ||
		toolName === "grep" ||
		toolName === "find" ||
		toolName === "ls"
	)
		return "read";
	return undefined;
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
