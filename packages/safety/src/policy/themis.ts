import { deterministicDigest, sortStrings } from "reporting";
import { dangerousCommandReasons } from "./dangerous-command.js";
import {
	generatedArtifactReasons,
	protectedPathReasons,
} from "./protected-paths.js";
import { redactPolicySecrets } from "./secrets.js";
import type {
	HookPolicyStatus,
	PolicyDecision,
	PolicyEvent,
	PolicyEventType,
} from "./types.js";
import { workspaceOwnershipReasons } from "./workspace-ownership.js";

const SUBSCRIBED_EVENTS: PolicyEventType[] = [
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

const BLOCK_REASON_PATTERN =
	/blocked|denied|requires ownership proof|missing plan approval|hash mismatch|without lock|without manifest/i;

export function decidePolicy(event: PolicyEvent): PolicyDecision {
	const reasons: string[] = [];
	const redactions: string[] = [];
	let redactedText: string | null = null;
	let requiredNextAction: string | null = null;

	if (event.eventType === "tool_call") {
		reasons.push(...dangerousCommandReasons(event.command, event.argv));
		reasons.push(...workspaceOwnershipReasons(event));
		for (const filePath of event.paths ?? [event.path].filter(isString)) {
			reasons.push(...protectedPathReasons(filePath, event.manifestOwned));
		}
		reasons.push(
			...generatedArtifactReasons(event.generatedArtifact, event.manifestOwned),
		);
		if (event.packageExecutable === true) {
			reasons.push(
				"package executable install/load attempt blocked until trust, lock, and sandbox gates pass",
			);
		}
		if (event.requiresPlanApproval === true && event.planApproved !== true) {
			reasons.push("missing plan approval for trust-sensitive operation");
		}
	}

	if (event.eventType === "tool_result" && event.text !== undefined) {
		const redacted = redactPolicySecrets(event.text);
		redactedText = redacted.text;
		redactions.push(...redacted.redactions);
		if (redacted.hasSecrets)
			reasons.push("secret-looking tool output redacted");
	}

	if (event.eventType === "before_provider_request") {
		if ((event.payloadBytes ?? 0) > 120_000) {
			reasons.push(
				"provider payload size warning: expensive workflow pressure",
			);
		}
		if (event.quotaPressure === true) {
			reasons.push(
				"quota pressure warning emitted without inventing provider limits",
			);
		}
		if (event.text !== undefined) {
			const redacted = redactPolicySecrets(event.text);
			redactedText = redacted.text;
			redactions.push(...redacted.redactions);
			if (redacted.hasSecrets)
				reasons.push(
					"provider payload secret-looking value redacted from audit evidence",
				);
		}
	}

	if (event.eventType === "resources_discover" && event.olympiOwned !== true) {
		reasons.push(
			"non-Olympi-owned resource discovery blocked from runtime exposure",
		);
	}

	if (
		(event.eventType === "input" ||
			event.eventType === "model_select" ||
			event.eventType === "thinking_level_select") &&
		event.quotaPressure === true
	) {
		reasons.push("quota pressure warning emitted without fabricated limits");
	}

	appendTrustReasons(event, reasons);
	const sortedReasons = sortStrings(reasons);
	const sortedRedactions = sortStrings(redactions);
	const decision = decideKind(event.eventType, sortedReasons, sortedRedactions);
	if (decision === "block") requiredNextAction = nextAction(sortedReasons);
	if (decision === "warn")
		requiredNextAction = "review policy warnings before continuing";
	return {
		schemaVersion: 1,
		module: "themis",
		eventType: event.eventType,
		subject: subjectFor(event),
		decision,
		reasons: sortedReasons,
		redactions: sortedRedactions,
		requiredNextAction,
		auditId: deterministicDigest({
			event,
			reasons: sortedReasons,
			redactions: sortedRedactions,
		}),
		blocked: decision === "block",
		redactedText,
	};
}

export function hookPolicyStatus(): HookPolicyStatus {
	return {
		schemaVersion: 1,
		command: "hooks policy",
		module: "aegis",
		runtimeExecutionEnabled: false,
		failClosedEvents: SUBSCRIBED_EVENTS,
		tokenEfficiencyFailOpen: true,
		subscribedEvents: SUBSCRIBED_EVENTS,
		thirdPartyCodeExecution: false,
		status: "ready-non-executing",
		warnings: [
			"Aegis skeleton calls pure Themis policy decisions only; no third-party package code is executed.",
			"Workspace mutations require manifest/hash/provenance ownership or explicit user approval; ambiguous paths fail closed.",
			"Safety decisions fail closed; token-efficiency degradations may allow only after recording reasons.",
		],
	};
}

function appendTrustReasons(event: PolicyEvent, reasons: string[]): void {
	const trust = event.trust;
	if (trust === undefined) return;
	if (trust.unsigned === true) reasons.push("unsigned package warning");
	if (trust.hashMismatch === true)
		reasons.push("hash mismatch blocks executable load");
	if (trust.executable === true && trust.locked !== true)
		reasons.push("executable load blocked without lock");
	if (trust.executable === true && trust.sandboxReady !== true)
		reasons.push("executable load blocked until sandbox is ready");
	if (trust.homeDenied !== true) reasons.push("home denied signage missing");
	if (trust.networkDenied !== true)
		reasons.push("network denied signage missing");
}

function decideKind(
	eventType: PolicyEventType,
	reasons: string[],
	redactions: string[],
): PolicyDecision["decision"] {
	if (reasons.some(isBlockReason)) return "block";
	if (redactions.length > 0 && eventType === "tool_result") return "redact";
	if (reasons.length > 0) return "warn";
	return "allow";
}

function isBlockReason(reason: string): boolean {
	return BLOCK_REASON_PATTERN.test(reason);
}

function nextAction(reasons: string[]): string {
	if (reasons.some((reason) => reason.includes("plan approval")))
		return "obtain explicit plan approval before retrying";
	if (reasons.some((reason) => reason.includes("ownership proof")))
		return "prove manifest/hash/provenance ownership or get explicit user approval before retrying";
	if (reasons.some((reason) => reason.includes("ambiguous workspace")))
		return "stop and ask for ownership clarification before touching ambiguous paths";
	if (reasons.some((reason) => reason.includes("manifest")))
		return "route through manifest-owned Olympi project operation";
	if (reasons.some((reason) => reason.includes("sandbox")))
		return "prove trust, lock, and sandbox gates before executable load";
	return "stop and review Olympi safety policy before retrying";
}

function subjectFor(event: PolicyEvent): string {
	return event.toolName ?? event.command ?? event.path ?? event.eventType;
}

function isString(value: unknown): value is string {
	return typeof value === "string";
}
