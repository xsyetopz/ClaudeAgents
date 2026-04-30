import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderRuntimeScript } from "@openagentlayer/runtime";
import { runRuntimeScript } from "../_helpers/runtime";

describe("OAL runtime scripts", () => {
	test("runtime scripts are loaded from separate source files", async () => {
		const script = await readFile(
			new URL("../../src/scripts/completion-gate.mjs", import.meta.url),
			"utf8",
		);

		expect(renderRuntimeScript("completion-gate")).toBe(script);
	});

	test("rendered runtime script accepts stdin JSON", async () => {
		const result = await runRuntimeScript(
			"completion-gate",
			JSON.stringify({ metadata: { validation_passed: true } }),
		);

		expect(JSON.parse(result.stdout).decision).toBe("allow");
	});

	test("rendered runtime script handles empty stdin as empty payload", async () => {
		const result = await runRuntimeScript("destructive-command-guard", "");
		const decision = JSON.parse(result.stdout);

		expect(result.exitCode).toBe(0);
		expect(decision).toMatchObject({
			decision: "allow",
			policy_id: "destructive-command-guard",
		});
	});

	test("rendered runtime script fails malformed JSON payloads", async () => {
		const result = await runRuntimeScript("completion-gate", "{bad json");

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("SyntaxError");
	});
});
