import type {
	AGENT_MODES,
	CLAUDE_MODEL_IDS,
	CODEX_MODEL_IDS,
	EFFORT_LEVELS,
	MODEL_IDS,
	MODEL_PLAN_IDS,
	POLICY_CATEGORIES,
	POLICY_FAILURE_MODES,
	POLICY_HANDLER_CLASSES,
	RECORD_KINDS,
	ROUTE_KINDS,
	SURFACES,
} from "./constants";

export type RecordKind = (typeof RECORD_KINDS)[number];
export type SourceRecordKind = RecordKind | "surface-config";
export type Surface = (typeof SURFACES)[number];
export type RouteKind = (typeof ROUTE_KINDS)[number];
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];
export type PolicyFailureMode = (typeof POLICY_FAILURE_MODES)[number];
export type PolicyHandlerClass = (typeof POLICY_HANDLER_CLASSES)[number];
export type AgentMode = (typeof AGENT_MODES)[number];
export type ModelId = (typeof MODEL_IDS)[number];
export type ModelPlanId = (typeof MODEL_PLAN_IDS)[number];
export type CodexModelId = (typeof CODEX_MODEL_IDS)[number];
export type ClaudeModelId = (typeof CLAUDE_MODEL_IDS)[number];
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export type UnknownMap = Record<string, unknown>;
