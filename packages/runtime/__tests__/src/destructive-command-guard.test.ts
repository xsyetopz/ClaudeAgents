import { describe, expect, test } from "bun:test";
import { evaluateDestructiveCommandGuard } from "@openagentlayer/runtime";

describe("OAL destructive command guard runtime policy", () => {
	test("denies destructive shell", () => {
		expect(
			evaluateDestructiveCommandGuard({
				command: "rm -rf generated",
				policy_id: "destructive-command-guard",
			}).decision,
		).toBe("deny");
	});

	test("allows read-only shell", () => {
		expect(
			evaluateDestructiveCommandGuard({
				command: "git status --short",
				policy_id: "destructive-command-guard",
			}).decision,
		).toBe("allow");
	});
});
