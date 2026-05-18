export type PolicyEventType =
	| "tool_call"
	| "tool_result"
	| "before_provider_request"
	| "input"
	| "session_start"
	| "session_shutdown"
	| "resources_discover"
	| "model_select"
	| "thinking_level_select";

export type PolicyDecisionKind =
	| "allow"
	| "warn"
	| "block"
	| "redact"
	| "degraded-allow";

export interface TrustContext {
	unsigned?: boolean;
	locked?: boolean;
	hashMismatch?: boolean;
	trustedPassive?: boolean;
	executable?: boolean;
	sandboxReady?: boolean;
	homeDenied?: boolean;
	networkDenied?: boolean;
}

export interface PolicyEvent {
	schemaVersion: 1;
	eventType: PolicyEventType;
	toolName?: string;
	operation?: "read" | "write" | "edit" | "execute" | "delete" | "network";
	command?: string;
	argv?: string[];
	path?: string;
	paths?: string[];
	text?: string;
	payloadBytes?: number;
	generatedArtifact?: boolean;
	manifestOwned?: boolean;
	packageExecutable?: boolean;
	requiresPlanApproval?: boolean;
	planApproved?: boolean;
	quotaPressure?: boolean;
	olympusOwned?: boolean;
	trust?: TrustContext;
}

export interface PolicyDecision {
	schemaVersion: 1;
	module: "themis";
	eventType: PolicyEventType;
	subject: string;
	decision: PolicyDecisionKind;
	reasons: string[];
	redactions: string[];
	requiredNextAction: string | null;
	auditId: string;
	blocked: boolean;
	redactedText: string | null;
}

export interface HookPolicyStatus {
	schemaVersion: 1;
	command: "hooks policy";
	module: "aegis";
	runtimeExecutionEnabled: false;
	failClosedEvents: PolicyEventType[];
	tokenEfficiencyFailOpen: boolean;
	subscribedEvents: PolicyEventType[];
	thirdPartyCodeExecution: false;
	status: "ready-non-executing";
	warnings: string[];
}
