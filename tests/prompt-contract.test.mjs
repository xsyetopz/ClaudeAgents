import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function collectFiles(relativeRoot, matcher) {
	const root = path.join(ROOT, relativeRoot);
	const files = [];
	const visit = (absolutePath) => {
		for (const entry of readdirSync(absolutePath)) {
			const child = path.join(absolutePath, entry);
			if (statSync(child).isDirectory()) {
				visit(child);
				continue;
			}
			const relativePath = path.relative(ROOT, child);
			if (matcher(relativePath)) {
				files.push(relativePath);
			}
		}
	};
	visit(root);
	return files.sort();
}

describe("prompt contract hardening", () => {
	it("keeps the no-hedge contract in canonical guidance", () => {
		const shared = read("source/shared/constraints.md");
		const codexOverlay = read("source/platform-overlays/codex-agent.md");
		assert.match(shared, /### No-Hedge Contract/);
		assert.match(shared, /Do not use task-shrinking language/);
		assert.match(
			codexOverlay,
			/Finish the requested work or report the structured blocker/,
		);
	});

	it("keeps every authored agent prompt on the required structure", () => {
		for (const agent of [
			"athena",
			"hephaestus",
			"nemesis",
			"hermes",
			"atalanta",
			"calliope",
			"odysseus",
		]) {
			const prompt = read(`source/agents/${agent}/prompt.md`);
			assert.match(prompt, /^## Mission$/m, agent);
			assert.match(prompt, /^## Required Workflow$/m, agent);
			assert.match(prompt, /^## Reference Parity Contract$/m, agent);
			assert.match(prompt, /^## No-Hedge Contract$/m, agent);
			assert.match(prompt, /^## Output Contract$/m, agent);
		}
	});

	it("keeps authored prompt surfaces free of hedge phrases", () => {
		const surfaces = [
			"source/shared/constraints.md",
			"source/shared/prompt-contract.md",
			"source/guidance/codex.md",
			"source/guidance/claude.md",
			"source/guidance/copilot.md",
			"source/guidance/opencode.md",
			"source/platform-overlays/codex-agent.md",
			"source/platform-overlays/claude-agent.md",
			"source/platform-overlays/copilot-agent.md",
			"source/platform-overlays/opencode-agent.md",
			"source/skills/openagentsbtw/body.md",
			"opencode/src/plugins.ts",
			...collectFiles("source/agents", (relativePath) =>
				relativePath.endsWith("/prompt.md"),
			),
			...collectFiles("source/commands", (relativePath) =>
				relativePath.endsWith(".json"),
			),
			...collectFiles("source/skills", (relativePath) =>
				relativePath.endsWith("/body.md"),
			),
		];
		const banned =
			/\b(out of scope|future PR|for now|if you want|would you like|let me know|close enough|inspired by|best effort|optional-offer|scope creep|deferred core|fallback scaffolding)\b/i;
		for (const surface of surfaces) {
			assert.doesNotMatch(read(surface), banned, surface);
		}
	});

	it("uses declarative queue next-step wording", () => {
		const codexQueue = read("codex/hooks/scripts/session/_queue.mjs");
		const claudeQueue = read("claude/hooks/scripts/session/_queue.mjs");
		assert.match(codexQueue, /After this task, run \\`\/queue next\\`/);
		assert.match(claudeQueue, /After this task, run \\`\/queue next\\`/);
		assert.doesNotMatch(codexQueue, /if you want to process one manually/);
		assert.doesNotMatch(claudeQueue, /if you want to process one manually/);
	});

	it("treats caveman regex drift as advisory, not hard block", () => {
		const codexStop = read("codex/hooks/scripts/post/stop-scan.mjs");
		const claudeStop = read("claude/hooks/scripts/post/_stop-shared.mjs");
		assert.match(codexStop, /detected prose drift \(advisory\)/);
		assert.match(claudeStop, /detected prose drift \(advisory\)/);
		assert.doesNotMatch(codexStop, /rejected verbose assistant prose/);
		assert.doesNotMatch(claudeStop, /rejected verbose assistant prose/);
	});
});
