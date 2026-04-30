import { readFileSync } from "node:fs";
import type { Surface } from "@openagentlayer/types";

export type RuntimeDecisionKind = "allow" | "deny" | "warn" | "context";

export interface RuntimePayload {
	readonly surface?: string;
	readonly event?: string;
	readonly policy_id?: string;
	readonly cwd?: string;
	readonly tool_name?: string;
	readonly tool_input?: unknown;
	readonly command?: string;
	readonly paths?: readonly string[];
	readonly route?: string;
	readonly metadata?: Record<string, unknown>;
}

interface DriftManifestEntry {
	readonly path: string;
	readonly sha256: string;
}

interface DriftManifest {
	readonly targetRoot?: string;
	readonly entries?: readonly DriftManifestEntry[];
}

export interface RuntimeDecision {
	readonly decision: RuntimeDecisionKind;
	readonly policy_id: string;
	readonly message: string;
	readonly context?: Record<string, unknown>;
}

export interface SyntheticHookPayloadOptions {
	readonly surface: Surface;
	readonly event: string;
	readonly policyId: string;
	readonly command?: string;
	readonly toolInput?: unknown;
	readonly metadata?: Record<string, unknown>;
}

const DESTRUCTIVE_COMMAND_PATTERNS: readonly RegExp[] = [
	/\brm\s+-rf\b/u,
	/\brm\s+-fr\b/u,
	/\bgit\s+reset\s+--hard\b/u,
	/\bgit\s+clean\s+-fd\b/u,
	/\bsudo\s+rm\b/u,
	/\bchmod\s+-R\s+777\b/u,
	/>\s*\/dev\/(disk|rdisk)/u,
];
const TRAILING_SLASH_PATTERN = /\/$/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:/u;
const PATH_SEPARATOR_PATTERN = /[\\/]/u;
const RUNTIME_SCRIPT_FILES = {
	"completion-gate": "completion-gate.mjs",
	"destructive-command-guard": "destructive-command-guard.mjs",
	"source-drift-guard": "source-drift-guard.mjs",
} as const satisfies Record<string, string>;

export function evaluateCompletionGate(
	payload: RuntimePayload,
): RuntimeDecision {
	const metadata = extractMetadata(payload);
	const hasValidationEvidence =
		metadata["validation_passed"] === true ||
		metadata["validation"] === "passed" ||
		metadata["validation"] === "pass";

	if (hasValidationEvidence) {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "completion-gate",
			message: "Completion gate satisfied.",
		};
	}

	return {
		decision: "deny",
		policy_id: payload.policy_id ?? "completion-gate",
		message: "Completion blocked: missing validation evidence.",
	};
}

export function evaluateDestructiveCommandGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const command = extractCommand(payload);
	if (command === "") {
		return {
			decision: "allow",
			policy_id: payload.policy_id ?? "destructive-command-guard",
			message: "No shell command detected.",
		};
	}

	for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
		if (pattern.test(command)) {
			return {
				decision: "deny",
				policy_id: payload.policy_id ?? "destructive-command-guard",
				message: `Command blocked by destructive-command guard: ${command}`,
			};
		}
	}

	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "destructive-command-guard",
		message: "Command allowed.",
	};
}

export function evaluateRuntimePolicy(
	payload: RuntimePayload,
): RuntimeDecision {
	switch (payload.policy_id) {
		case "completion-gate":
			return evaluateCompletionGate(payload);
		case "destructive-command-guard":
			return evaluateDestructiveCommandGuard(payload);
		default:
			return {
				decision: "warn",
				policy_id: payload.policy_id ?? "unknown-policy",
				message: "Unknown policy id.",
			};
	}
}

export async function evaluateSourceDriftGuard(
	payload: RuntimePayload,
): Promise<RuntimeDecision> {
	const manifestPath = extractStringMetadata(payload, "manifest_path");
	const targetRoot =
		extractStringMetadata(payload, "target_root") ??
		payload.cwd ??
		process.cwd();
	const manifestPaths =
		manifestPath === undefined
			? await discoverManifestPaths(targetRoot)
			: [manifestPath];
	if (manifestPaths.length === 0) {
		return {
			decision: "deny",
			policy_id: payload.policy_id ?? "source-drift-guard",
			message: "Source drift guard failed: no managed manifest found.",
		};
	}

	const issues: string[] = [];
	for (const path of manifestPaths) {
		const manifestFile = Bun.file(path);
		if (!(await manifestFile.exists())) {
			issues.push(`missing-manifest:${path}`);
			continue;
		}
		const manifest = JSON.parse(await manifestFile.text()) as DriftManifest;
		for (const entry of manifest.entries ?? []) {
			if (!isSafeRelativePath(entry.path)) {
				issues.push(`path-escape:${entry.path}`);
				continue;
			}
			const filePath = `${targetRoot.replace(TRAILING_SLASH_PATTERN, "")}/${entry.path}`;
			const file = Bun.file(filePath);
			if (!(await file.exists())) {
				issues.push(`missing:${entry.path}`);
				continue;
			}
			const actualSha = await sha256(await file.text());
			if (actualSha !== entry.sha256) {
				issues.push(`changed:${entry.path}`);
			}
		}
	}

	if (issues.length > 0) {
		return {
			context: { issues },
			decision: "deny",
			policy_id: payload.policy_id ?? "source-drift-guard",
			message: `Managed install drift detected: ${issues.join(", ")}`,
		};
	}

	return {
		decision: "allow",
		policy_id: payload.policy_id ?? "source-drift-guard",
		message: "Managed install matches manifest.",
	};
}

export function createSyntheticHookPayload(
	options: SyntheticHookPayloadOptions,
): RuntimePayload {
	return {
		event: options.event,
		policy_id: options.policyId,
		surface: options.surface,
		...(options.command === undefined ? {} : { command: options.command }),
		...(options.toolInput === undefined
			? {}
			: { tool_input: options.toolInput }),
		...(options.metadata === undefined ? {} : { metadata: options.metadata }),
	};
}

export function renderRuntimeScript(policyId: string): string {
	const fileName =
		RUNTIME_SCRIPT_FILES[policyId as keyof typeof RUNTIME_SCRIPT_FILES];
	if (fileName === undefined) {
		throw new Error(`Unknown runtime policy script '${policyId}'.`);
	}
	return readFileSync(
		new URL(`./scripts/${fileName}`, import.meta.url),
		"utf8",
	);
}

function extractCommand(payload: RuntimePayload): string {
	if (typeof payload.command === "string") {
		return payload.command;
	}

	const toolInput = payload.tool_input;
	if (typeof toolInput === "object" && toolInput !== null) {
		const candidate = toolInput as Record<string, unknown>;
		if (typeof candidate["command"] === "string") {
			return candidate["command"];
		}
		if (typeof candidate["cmd"] === "string") {
			return candidate["cmd"];
		}
	}

	return "";
}

function extractMetadata(payload: RuntimePayload): Record<string, unknown> {
	if (payload.metadata !== undefined) {
		return payload.metadata;
	}

	const toolInput = payload.tool_input;
	if (typeof toolInput === "object" && toolInput !== null) {
		const candidate = toolInput as Record<string, unknown>;
		if (
			typeof candidate["metadata"] === "object" &&
			candidate["metadata"] !== null
		) {
			return candidate["metadata"] as Record<string, unknown>;
		}
	}

	return {};
}

function extractStringMetadata(
	payload: RuntimePayload,
	key: string,
): string | undefined {
	const value = extractMetadata(payload)[key];
	return typeof value === "string" ? value : undefined;
}

async function sha256(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function discoverManifestPaths(
	targetRoot: string,
): Promise<readonly string[]> {
	const root = targetRoot.replace(TRAILING_SLASH_PATTERN, "");
	const candidates = [
		"codex-project",
		"claude-project",
		"opencode-project",
		"codex-global",
		"claude-global",
		"opencode-global",
	].map((name) => `${root}/.oal/manifest/${name}.json`);
	const existing: string[] = [];
	for (const candidate of candidates) {
		if (await Bun.file(candidate).exists()) {
			existing.push(candidate);
		}
	}
	return existing;
}

function isSafeRelativePath(path: string): boolean {
	return !(
		path.startsWith("/") ||
		WINDOWS_ABSOLUTE_PATH_PATTERN.test(path) ||
		path.split(PATH_SEPARATOR_PATTERN).includes("..")
	);
}
