import { extractMetadata } from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

export function evaluatePromptContextInjection(
	payload: RuntimePayload,
): RuntimeDecision {
	const route = payload.route ?? "default";
	const metadata = extractMetadata(payload);
	const routeContract = String(metadata["route_contract"] ?? "readonly");
	const policyId = String(
		metadata["active_policy"] ?? payload.policy_id ?? "none",
	);
	const validation = String(metadata["validation"] ?? "required-after-edits");
	return {
		context: {
			prompt_append: [
				"OpenAgentLayer context:",
				`- Surface: ${payload.surface ?? "unknown"}.`,
				`- Event: ${payload.event ?? "unknown"}.`,
				`- Route: ${route}.`,
				`- Route contract: ${routeContract}.`,
				`- Active policy: ${policyId}.`,
				`- Validation expectation: ${validation}.`,
				"- Use OAL source graph roles, commands, skills, policies, and validation contracts.",
				"- Preserve tool-native behavior; do not invent harness/framework behavior.",
			].join("\n"),
		},
		decision: "context",
		policy_id: payload.policy_id ?? "prompt-context-injection",
		message: "OAL prompt context available.",
	};
}
