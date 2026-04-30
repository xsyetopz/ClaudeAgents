import { describe, expect, test } from "bun:test";
import { evaluateCompletionGate } from "@openagentlayer/runtime";

describe("OAL completion gate runtime policy", () => {
	test("allows accepted validation evidence", () => {
		expect(
			evaluateCompletionGate({
				metadata: { validation: "passed" },
				policy_id: "completion-gate",
			}).decision,
		).toBe("allow");
	});

	test("denies missing validation evidence", () => {
		expect(
			evaluateCompletionGate({
				metadata: {},
				policy_id: "completion-gate",
			}).decision,
		).toBe("deny");
	});

	test("reads OpenCode-style nested metadata", () => {
		expect(
			evaluateCompletionGate({
				policy_id: "completion-gate",
				tool_input: { metadata: { validation_passed: true } },
			}).decision,
		).toBe("allow");
	});
});
