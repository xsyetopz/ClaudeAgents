export const RECORD_KINDS = [
	"agent",
	"skill",
	"command",
	"policy",
	"guidance",
	"model-plan",
] as const;

export const SURFACES = ["codex", "claude", "opencode"] as const;

export const ROUTE_KINDS = [
	"readonly",
	"edit-required",
	"execution-required",
] as const;

export const POLICY_CATEGORIES = [
	"session_context",
	"input_guard",
	"execution_guard",
	"output_safety",
	"completion_gate",
	"delegation",
	"vcs_gate",
	"drift_guard",
	"context_budget",
] as const;

export const POLICY_FAILURE_MODES = [
	"fail_open",
	"fail_closed",
	"warn_only",
] as const;

export const POLICY_HANDLER_CLASSES = [
	"command_script",
	"prompt_review",
	"agent_review",
	"http_callout",
	"mcp_callout",
] as const;

export const AGENT_MODES = ["primary", "subagent", "both"] as const;

export const MODEL_IDS = [
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.3-codex",
	"gpt-5.2",
	"haiku",
	"sonnet",
	"opus",
	"opusplan",
	"opus[1m]",
	"claude-haiku-4-5",
	"claude-sonnet-4-6",
	"claude-opus-4-6",
	"claude-opus-4-6[1m]",
	"claude-opus-4-7",
	"claude-opus-4-7[1m]",
] as const;

export const EFFORT_LEVELS = [
	"none",
	"low",
	"medium",
	"high",
	"xhigh",
	"max" /* used by Anthropic Claude */,
] as const;

export const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const MODEL_PLAN_IDS = [
	"codex-plus",
	"codex-pro-5",
	"codex-pro-20",
	"claude-max-5",
	"claude-max-20",
] as const;

export const CODEX_MODEL_IDS = [
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.3-codex",
	"gpt-5.2",
] as const;

export const CLAUDE_MODEL_IDS = [
	"haiku" /* alias for 'claude-haiku-4-5' */,
	"sonnet" /* alias for 'claude-sonnet-4-6' */,
	"opus" /* alias for 'claude-opus-4-7' */,
	"opusplan" /* 'claude-opus-4-7[1m]' for planning, 'claude-sonnet-4-6' for implementation */,
	"opus[1m]" /* alias for 'claude-opus-4-7[1m]' */,
	"claude-haiku-4-5",
	"claude-sonnet-4-6",
	"claude-opus-4-6",
	"claude-opus-4-6[1m]",
	"claude-opus-4-7",
	"claude-opus-4-7[1m]",
] as const;
