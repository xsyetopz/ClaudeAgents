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
	return [
		"#!/usr/bin/env node",
		`const policyId = ${JSON.stringify(policyId)};`,
		`const destructiveCommandPatterns = ${renderPatternArray(DESTRUCTIVE_COMMAND_PATTERNS)};`,
		"async function readStdin() {",
		"  let text = '';",
		"  for await (const chunk of process.stdin) text += chunk;",
		"  return text.trim() === '' ? {} : JSON.parse(text);",
		"}",
		"function extractCommand(payload) {",
		"  if (typeof payload.command === 'string') return payload.command;",
		"  const input = payload.tool_input;",
		"  if (input && typeof input === 'object') {",
		"    if (typeof input.command === 'string') return input.command;",
		"    if (typeof input.cmd === 'string') return input.cmd;",
		"  }",
		"  return '';",
		"}",
		"function evaluateCompletionGate(payload) {",
		"  const metadata = payload.metadata || (payload.tool_input && payload.tool_input.metadata) || {};",
		"  const ok = metadata.validation_passed === true || metadata.validation === 'passed' || metadata.validation === 'pass';",
		"  return ok ? { decision: 'allow', policy_id: policyId, message: 'Completion gate satisfied.' } : { decision: 'deny', policy_id: policyId, message: 'Completion blocked: missing validation evidence.' };",
		"}",
		"function evaluateDestructiveCommandGuard(payload) {",
		"  const command = extractCommand(payload);",
		"  if (command === '') return { decision: 'allow', policy_id: policyId, message: 'No shell command detected.' };",
		"  for (const pattern of destructiveCommandPatterns) {",
		"    if (pattern.test(command)) return { decision: 'deny', policy_id: policyId, message: 'Command blocked by destructive-command guard: ' + command };",
		"  }",
		"  return { decision: 'allow', policy_id: policyId, message: 'Command allowed.' };",
		"}",
		"function evaluateRuntimePolicy(payload) {",
		"  switch (policyId) {",
		"    case 'completion-gate':",
		"      return evaluateCompletionGate(payload);",
		"    case 'destructive-command-guard':",
		"      return evaluateDestructiveCommandGuard(payload);",
		"    default:",
		"      return { decision: 'warn', policy_id: policyId || 'unknown-policy', message: 'Unknown policy id.' };",
		"  }",
		"}",
		"const payload = await readStdin();",
		"const decision = evaluateRuntimePolicy(payload);",
		"process.stdout.write(JSON.stringify(decision) + '\\n');",
		"process.exit(decision.decision === 'deny' ? 1 : 0);",
		"",
	].join("\n");
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

function renderPatternArray(patterns: readonly RegExp[]): string {
	return `[${patterns.map((pattern) => pattern.toString()).join(", ")}]`;
}
