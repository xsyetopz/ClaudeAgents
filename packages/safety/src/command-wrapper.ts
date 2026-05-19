import { decidePolicy } from "./policy/themis.js";
import type {
	AgentCommandClass,
	OwnershipProof,
	PolicyDecision,
	PolicyEvent,
	WorkspaceOperation,
} from "./policy/types.js";
import { classifyWorkspaceCommand } from "./policy/workspace-ownership.js";

export interface CommandExecutionInput {
	rawCommand: string;
	cwd: string;
	env?: Record<string, string | undefined>;
	declaredOperationClass?: AgentCommandClass;
	candidateTouchedPaths?: string[];
	provenanceProof?: OwnershipProof;
	manifestOwned?: boolean;
}

export interface NormalizedCommandExecution {
	schemaVersion: 1;
	rawCommand: string;
	executable: string | null;
	argv: string[];
	cwd: string;
	environmentRedacted: boolean;
	declaredOperationClass: AgentCommandClass;
	candidateTouchedPaths: string[];
	readOnly: boolean;
	write: boolean;
	destructive: boolean;
	revert: boolean;
	stage: boolean;
	commit: boolean;
	provenanceRequirement: string;
	policyDecision: PolicyDecision;
	blockerReason: string | null;
}

export function normalizeCommandExecution(
	input: CommandExecutionInput,
): NormalizedCommandExecution {
	const classification = classifyWorkspaceCommand(input.rawCommand);
	const declaredOperationClass =
		input.declaredOperationClass ?? classification.primaryClass;
	const candidateTouchedPaths =
		input.candidateTouchedPaths ?? classification.paths;
	const policyEvent = policyEventFromNormalizedCommand({
		input,
		declaredOperationClass,
		candidateTouchedPaths,
	});
	const policyDecision = decidePolicy(policyEvent);
	const withoutDecision = {
		schemaVersion: 1 as const,
		rawCommand: input.rawCommand,
		executable: classification.executable ?? null,
		argv: classification.argv,
		cwd: input.cwd,
		environmentRedacted: input.env !== undefined,
		declaredOperationClass,
		candidateTouchedPaths,
		readOnly: declaredOperationClass === "read-only-inspection",
		write: ["formatting-write", "generated-artifact"].includes(
			declaredOperationClass,
		),
		destructive: declaredOperationClass === "destructive-workspace",
		revert: declaredOperationClass === "revert-like",
		stage: declaredOperationClass === "staging",
		commit: declaredOperationClass === "commit",
		provenanceRequirement:
			classification.policy.requiredProvenanceChecks.join("; "),
		policyDecision,
		blockerReason: policyDecision.blocked
			? (policyDecision.requiredNextAction ?? policyDecision.reasons.join("; "))
			: null,
	};
	return withoutDecision;
}

export function policyEventFromNormalizedCommand(options: {
	input: CommandExecutionInput;
	declaredOperationClass: AgentCommandClass;
	candidateTouchedPaths: string[];
}): PolicyEvent {
	const operation = operationForClass(options.declaredOperationClass);
	return {
		schemaVersion: 1,
		eventType: "tool_call",
		toolName: "olympi-command-wrapper",
		operation: "execute",
		command: options.input.rawCommand,
		paths: options.candidateTouchedPaths,
		manifestOwned: options.input.manifestOwned === true,
		workspace: {
			...(operation === null ? {} : { operation }),
			paths: options.candidateTouchedPaths,
			proof: options.input.provenanceProof ?? "unknown",
			ambiguous:
				(options.input.provenanceProof ?? "unknown") === "unknown" &&
				options.candidateTouchedPaths.length > 0,
		},
		providerMetadata: {
			source: "normalized-wrapper",
			missingFields: [],
			eventShape: [
				"rawCommand",
				"executable",
				"argv",
				"cwd",
				"candidateTouchedPaths",
			],
			explicitSafeWrapper: true,
		},
	};
}

function operationForClass(
	className: AgentCommandClass,
): WorkspaceOperation | null {
	if (className === "formatting-write" || className === "generated-artifact")
		return "write";
	if (className === "destructive-workspace") return "delete";
	if (className === "revert-like") return "revert";
	if (className === "staging") return "stage";
	if (className === "commit") return "commit";
	return null;
}
