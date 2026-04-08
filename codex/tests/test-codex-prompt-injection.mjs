import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(
	__dirname,
	"..",
	"hooks",
	"scripts",
	"session",
	"prompt-git-context.mjs",
);

function runHook(inputJson) {
	return spawnSync("node", [HOOK], {
		input: JSON.stringify(inputJson),
		encoding: "utf8",
		timeout: 15000,
	});
}

describe("codex UserPromptSubmit injection", () => {
	it("injects $openagentsbtw by default", () => {
		const result = runHook({ prompt: "hello", cwd: process.cwd() });
		assert.equal(result.status, 0);
		assert.ok(result.stdout.trimStart().startsWith("$openagentsbtw"));
	});

	it("does not duplicate when prompt already includes $openagentsbtw", () => {
		const result = runHook({ prompt: "$openagentsbtw hello", cwd: process.cwd() });
		assert.equal(result.status, 0);
		assert.ok(!result.stdout.includes("$openagentsbtw\n\n$openagentsbtw"));
	});

	it("respects !raw opt-out", () => {
		const result = runHook({ prompt: "!raw hello", cwd: process.cwd() });
		assert.equal(result.status, 0);
		assert.equal(result.stdout, "");
	});
});

