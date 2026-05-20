export type PolicyEventType =
	| "tool_call"
	| "tool_result"
	| "tool_execution_start"
	| "tool_execution_end"
	| "before_provider_request"
	| "after_provider_response"
	| "input"
	| "before_agent_start"
	| "agent_end"
	| "turn_end"
	| "message_end"
	| "user_bash"
	| "context"
	| "session_start"
	| "session_before_compact"
	| "session_compact"
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

export type WorkspaceOperation =
	| "edit"
	| "write"
	| "revert"
	| "delete"
	| "move"
	| "format"
	| "stage"
	| "commit";

export type AgentCommandClass =
	| "read-only-inspection"
	| "formatting-write"
	| "destructive-workspace"
	| "revert-like"
	| "staging"
	| "commit"
	| "generated-artifact"
	| "unknown";

export interface CommandClassificationAudit {
	primaryClass: AgentCommandClass;
	classes: AgentCommandClass[];
	operation: WorkspaceOperation | null;
	paths: string[];
	executable?: string;
	argv?: string[];
	complexShell: boolean;
	unknownMutationIndicators: string[];
	requiresOwnershipProof: boolean;
	blocksWhenAmbiguous: boolean;
	writesWorkspace: boolean;
	allowedPreconditions: string[];
	requiredProvenanceChecks: string[];
	blockerBehavior: string;
	auditOutput: string[];
}

export interface ProviderMetadataContext {
	source: "provider-event" | "normalized-wrapper";
	missingFields: string[];
	eventShape: string[];
	explicitSafeWrapper?: boolean;
	preventedOperation?: string;
}

export interface PolicyBlockerReport {
	kind: "missing-provider-metadata" | "workspace-ownership" | "unknown-command";
	missingFields: string[];
	preventedOperation: string;
	requiredAction: string;
}

export type OwnershipProof =
	| "manifest-hash"
	| "provenance-record"
	| "agent-created-this-run"
	| "explicit-user-approval"
	| "unknown";

export interface WorkspaceOwnershipContext {
	operation?: WorkspaceOperation;
	paths?: string[];
	proof?: OwnershipProof;
	ambiguous?: boolean;
	userOwned?: boolean;
	generated?: boolean;
	changed?: boolean;
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
	olympiOwned?: boolean;
	trust?: TrustContext;
	workspace?: WorkspaceOwnershipContext;
	providerMetadata?: ProviderMetadataContext;
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
	commandClassification?: CommandClassificationAudit;
	blocker?: PolicyBlockerReport;
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
