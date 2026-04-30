import { describe, expect, test } from "bun:test";
import { evaluatePromptContextInjection } from "@openagentlayer/runtime";
import { runRuntimeScript } from "../_helpers/runtime";

describe("OAL prompt context injection runtime policy", () => {
	test("returns prompt append context", () => {
		const decision = evaluatePromptContextInjection({
			event: "UserPromptSubmit",
			policy_id: "prompt-context-injection",
			route: "plan",
			surface: "codex",
		});

		expect(decision.decision).toBe("context");
		expect(decision.context?.["prompt_append"]).toContain(
			"OpenAgentLayer context:",
		);
		expect(decision.context?.["prompt_append"]).toContain("Route: plan");
		expect(decision.context?.["prompt_append"]).toContain(
			"Route contract: readonly",
		);
	});

	test("returns enriched metadata in prompt append context", () => {
		const decision = evaluatePromptContextInjection({
			event: "UserPromptSubmit",
			metadata: {
				active_policy: "completion-gate",
				route_contract: "edit-required",
				validation: "passed",
			},
			policy_id: "prompt-context-injection",
			route: "implement",
			surface: "claude",
		});

		expect(decision.context?.["prompt_append"]).toContain(
			"Route contract: edit-required",
		);
		expect(decision.context?.["prompt_append"]).toContain(
			"Active policy: completion-gate",
		);
		expect(decision.context?.["prompt_append"]).toContain(
			"Validation expectation: passed",
		);
	});

	test("rendered prompt context script returns context decision", async () => {
		const result = await runRuntimeScript(
			"prompt-context-injection",
			JSON.stringify({ event: "UserPromptSubmit", surface: "codex" }),
		);

		expect(JSON.parse(result.stdout).decision).toBe("context");
	});
});
