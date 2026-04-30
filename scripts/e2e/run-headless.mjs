#!/usr/bin/env bun
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runProcess, summarizeFailure } from "./_helpers.mjs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const scripts = [
	"codex-headless.mjs",
	"opencode-headless.mjs",
	"claude-headless.mjs",
];

for (const script of scripts) {
	const result = await runProcess({
		args: ["bun", join(currentDir, script)],
		cwd: process.cwd(),
		timeoutMs: 600_000,
	});
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	if (result.exitCode !== 0) {
		console.error(`${script} failed: ${summarizeFailure(result)}`);
		process.exit(result.exitCode);
	}
}
