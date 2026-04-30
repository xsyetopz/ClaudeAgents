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
	});

	test("rendered prompt context script returns context decision", async () => {
		const result = await runRuntimeScript(
			"prompt-context-injection",
			JSON.stringify({ event: "UserPromptSubmit", surface: "codex" }),
		);

		expect(JSON.parse(result.stdout).decision).toBe("context");
	});
});
