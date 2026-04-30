import { describe, expect, test } from "bun:test";
import {
	createSyntheticHookPayload,
	evaluateRuntimePolicy,
} from "@openagentlayer/runtime";

describe("OAL runtime policy router", () => {
	test("synthetic hook payload harness covers supported surface shapes", () => {
		const cases = [
			createSyntheticHookPayload({
				command: "git status --short",
				event: "PreToolUse",
				policyId: "destructive-command-guard",
				surface: "codex",
			}),
			createSyntheticHookPayload({
				event: "Stop",
				metadata: { validation: "passed" },
				policyId: "completion-gate",
				surface: "claude",
			}),
			createSyntheticHookPayload({
				event: "tool.execute.before",
				policyId: "destructive-command-guard",
				surface: "opencode",
				toolInput: { cmd: "bun test ./packages" },
			}),
		];

		expect(
			cases.map((payload) => evaluateRuntimePolicy(payload).decision),
		).toEqual(["allow", "allow", "allow"]);
	});
});
