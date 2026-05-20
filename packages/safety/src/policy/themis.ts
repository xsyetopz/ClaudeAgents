import { deterministicDigest, sortStrings } from "reporting/schema";
import { dangerousCommandReasons } from "./dangerous-command.js";
import {
	generatedArtifactReasons,
	protectedPathReasons,
} from "./protected-paths.js";
import { redactPolicySecrets } from "./secrets.js";
import type {
	CommandClassificationAudit,
	HookPolicyStatus,
	PolicyBlockerReport,
	PolicyDecision,
	PolicyEvent,
	PolicyEventType,
} from "./types.js";
import {
	classifyPolicyEventCommand,
	workspaceOwnershipReasons,
} from "./workspace-ownership.js";

const SUBSCRIBED_EVENTS: PolicyEventType[] = [
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

const BLOCK_REASON_PATTERN =
	/blocked|denied|requires ownership proof|missing plan approval|hash mismatch|without lock|without manifest|unknown command|complex shell|provider metadata missing/i;

export function decidePolicy(event: PolicyEvent): PolicyDecision {
	const reasons: string[] = [];
	const redactions: string[] = [];
	let redactedText: string | null = null;
	let requiredNextAction: string | null = null;
	let commandClassification: CommandClassificationAudit | undefined;
	let blocker: PolicyBlockerReport | undefined;

	switch (event.eventType) {
		case "tool_call": {
			commandClassification = classifyPolicyEventCommand(event).audit;
			const metadataBlocker = providerMetadataBlocker(
				event,
				commandClassification,
			);
			if (metadataBlocker !== undefined) {
				blocker = metadataBlocker;
				reasons.push(
					`provider metadata missing ${metadataBlocker.missingFields.join(", ")} for ${metadataBlocker.preventedOperation}; explicit safe wrapper or richer tool event required`,
				);
			}
			reasons.push(...dangerousCommandReasons(event.command, event.argv));
			reasons.push(...workspaceOwnershipReasons(event));
			for (const filePath of event.paths ?? [event.path].filter(isString)) {
				reasons.push(...protectedPathReasons(filePath, event.manifestOwned));
			}
			reasons.push(
				...generatedArtifactReasons(
					event.generatedArtifact,
					event.manifestOwned,
				),
			);
			if (event.packageExecutable === true) {
				reasons.push(
					"package executable install/load attempt blocked until trust, lock, and sandbox gates pass",
				);
			}
			if (event.requiresPlanApproval === true && event.planApproved !== true) {
				reasons.push("missing plan approval for trust-sensitive operation");
			}
			break;
		}
		case "tool_result":
			if (event.text !== undefined) {
				const redacted = redactPolicySecrets(event.text);
				redactedText = redacted.text;
				redactions.push(...redacted.redactions);
				if (redacted.hasSecrets)
					reasons.push("secret-looking tool output redacted");
			}
			break;
		case "before_provider_request":
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
			break;
		case "resources_discover":
			if (event.olympiOwned === false) {
				reasons.push(
					"non-Olympi-owned resource discovery blocked from runtime exposure",
				);
			}
			break;
		case "input":
		case "model_select":
		case "thinking_level_select":
			if (event.quotaPressure === true) {
				reasons.push(
					"quota pressure warning emitted without fabricated limits",
				);
			}
			break;
		case "session_start":
		case "session_shutdown":
			break;
		default:
			break;
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
		...(commandClassification === undefined ? {} : { commandClassification }),
		...(blocker === undefined ? {} : { blocker }),
	};
}

function providerMetadataBlocker(
	event: PolicyEvent,
	classification: CommandClassificationAudit,
): PolicyBlockerReport | undefined {
	const provider = event.providerMetadata;
	if (provider?.source === "normalized-wrapper" && provider.explicitSafeWrapper)
		return undefined;
	const missingFields = provider?.missingFields ?? [];
	if (missingFields.length === 0) return undefined;
	const pathSensitive =
		classification.requiresOwnershipProof ||
		classification.writesWorkspace ||
		event.operation === "write" ||
		event.operation === "edit" ||
		event.operation === "delete";
	const commandSensitive =
		event.operation === "execute" ||
		classification.primaryClass !== "read-only-inspection";
	const shouldBlock =
		(missingFields.includes("command") && commandSensitive) ||
		(missingFields.includes("path") && pathSensitive);
	if (!shouldBlock) return undefined;
	return {
		kind: "missing-provider-metadata",
		missingFields,
		preventedOperation:
			provider?.preventedOperation ??
			classification.operation ??
			event.operation ??
			classification.primaryClass,
		requiredAction:
			"route through the Olympi command wrapper or provide a richer provider tool event before retrying",
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
	switch (true) {
		case reasons.some(isBlockReason):
			return "block";
		case redactions.length > 0 && eventType === "tool_result":
			return "redact";
		case reasons.length > 0:
			return "warn";
		default:
			return "allow";
	}
}

function isBlockReason(reason: string): boolean {
	return BLOCK_REASON_PATTERN.test(reason);
}

function nextAction(reasons: string[]): string {
	if (reasons.some((reason) => reason.includes("provider metadata missing"))) {
		return "route through the Olympi command wrapper or provide a richer provider tool event before retrying";
	}
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
