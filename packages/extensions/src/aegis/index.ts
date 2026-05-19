import type { HookPolicyStatus, PolicyDecision, PolicyEvent } from "safety";
import { decidePolicy, hookPolicyStatus } from "safety";

export const AEGIS_EXTENSION_MANIFEST = {
	schemaVersion: 1,
	olympusOwned: true,
	name: "aegis",
	purpose:
		"Non-executing Olympus runtime safety hook skeleton backed by pure Themis policy decisions.",
	piEvents: [
		"tool_call",
		"tool_result",
		"before_provider_request",
		"input",
		"session_start",
		"session_shutdown",
		"resources_discover",
		"model_select",
		"thinking_level_select",
	],
	thirdPartyCodeExecution: false,
	runtimeExecutionEnabled: false,
} as const;

export function aegisPolicyStatus(): HookPolicyStatus {
	return hookPolicyStatus();
}

export function aegisDecide(event: PolicyEvent): PolicyDecision {
	return decidePolicy(event);
}
