import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	createSyntheticHookPayload,
	evaluateCompletionGate,
	evaluateDestructiveCommandGuard,
	evaluateRuntimePolicy,
	renderRuntimeScript,
} from "@openagentlayer/runtime";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL runtime policies", () => {
	test("completion gate allows accepted validation evidence", () => {
		expect(
			evaluateCompletionGate({
				metadata: { validation: "passed" },
				policy_id: "completion-gate",
			}).decision,
		).toBe("allow");
	});

	test("completion gate denies missing validation evidence", () => {
		expect(
			evaluateCompletionGate({
				metadata: {},
				policy_id: "completion-gate",
			}).decision,
		).toBe("deny");
	});

	test("completion gate reads OpenCode-style nested metadata", () => {
		expect(
			evaluateCompletionGate({
				policy_id: "completion-gate",
				tool_input: { metadata: { validation_passed: true } },
			}).decision,
		).toBe("allow");
	});

	test("destructive command guard denies destructive shell", () => {
		expect(
			evaluateDestructiveCommandGuard({
				command: "rm -rf generated",
				policy_id: "destructive-command-guard",
			}).decision,
		).toBe("deny");
	});

	test("destructive command guard allows read-only shell", () => {
		expect(
			evaluateDestructiveCommandGuard({
				command: "git status --short",
				policy_id: "destructive-command-guard",
			}).decision,
		).toBe("allow");
	});

	test("rendered runtime script accepts stdin JSON", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "completion-gate.mjs");
		await writeFile(scriptPath, renderRuntimeScript("completion-gate"));

		const process = Bun.spawn(["bun", scriptPath], {
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.write(
			JSON.stringify({ metadata: { validation_passed: true } }),
		);
		process.stdin.end();
		const output = await new Response(process.stdout).text();

		expect(JSON.parse(output).decision).toBe("allow");
	});

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
				surface: "claude-code",
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

	test("rendered runtime script handles empty stdin as empty payload", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "destructive-command-guard.mjs");
		await writeFile(
			scriptPath,
			renderRuntimeScript("destructive-command-guard"),
		);

		const process = Bun.spawn(["bun", scriptPath], {
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.end();
		const [exitCode, output] = await Promise.all([
			process.exited,
			new Response(process.stdout).text(),
		]);
		const decision = JSON.parse(output);

		expect(exitCode).toBe(0);
		expect(decision).toMatchObject({
			decision: "allow",
			policy_id: "destructive-command-guard",
		});
	});

	test("rendered runtime script fails malformed JSON payloads", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "completion-gate.mjs");
		await writeFile(scriptPath, renderRuntimeScript("completion-gate"));

		const process = Bun.spawn(["bun", scriptPath], {
			stderr: "pipe",
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.write("{bad json");
		process.stdin.end();
		const [exitCode, stderr] = await Promise.all([
			process.exited,
			new Response(process.stderr).text(),
		]);

		expect(exitCode).not.toBe(0);
		expect(stderr).toContain("SyntaxError");
	});
});
