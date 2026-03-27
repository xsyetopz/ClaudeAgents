import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

function read(relativePath) {
	return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("generated prompts", () => {
	it("renders OpenCode prompts without legacy XML tags", () => {
		const prompt = read("opencode/templates/agents/athena.md");
		assert.equal(prompt.includes("<identity>"), false);
		assert.equal(prompt.includes("<constraints>"), false);
		assert.equal(prompt.includes("<shared_constraints>"), false);
	});

	it("renders shared constraints once per prompt", () => {
		const prompt = read("opencode/templates/agents/hephaestus.md");
		const matches = prompt.match(/^## Shared Constraints$/gm) ?? [];
		assert.equal(matches.length, 1);
	});
});

describe("generated skills", () => {
	it("renders platform-specific ship co-author trailers", () => {
		const claudeShip = read("claude/skills/ship/SKILL.md");
		const codexShip = read("codex/plugin/openagentsbtw/skills/ship/SKILL.md");
		const opencodeShip = read("opencode/templates/skills/ship/SKILL.md");
		assert.match(
			claudeShip,
			/Co-Authored-By: Claude <claude@users\.noreply\.github\.com>/,
		);
		assert.equal(
			claudeShip.includes("Co-Authored-By: Codex via openagentsbtw"),
			false,
		);
		assert.equal(codexShip.includes("Co-Authored-By:"), false);
		assert.equal(opencodeShip.includes("Co-Authored-By:"), false);
	});
});

describe("generated Codex defaults", () => {
	it("uses native commit attribution and disables personality overlays", () => {
		const config = read("codex/templates/config.toml");
		assert.match(
			config,
			/commit_attribution = "Co-Authored-By: Codex <codex@users\.noreply\.github\.com>"/,
		);
		assert.match(config, /personality = "none"/);
		assert.equal(config.includes('personality = "pragmatic"'), false);
	});

	it("ports the CCA-style response contract into Codex guidance", () => {
		const guidance = read("codex/templates/AGENTS.md");
		assert.match(guidance, /Start with the answer, decision, or action\./);
		assert.match(guidance, /If something is uncertain, say `UNKNOWN`/);
		assert.equal(
			guidance.includes("Keep responses terse and peer-like."),
			false,
		);
	});

	it("ships wrapper prompts that route through explicit specialist paths", () => {
		const wrapper = read("bin/openagentsbtw-codex");
		assert.match(
			wrapper,
			/Route planning through athena-style architecture analysis/,
		);
		assert.match(
			wrapper,
			/Treat native \/plan as reasoning mode only, not role selection\./,
		);
		assert.match(
			wrapper,
			/Route implementation through hephaestus-style execution/,
		);
	});
});

describe("generated OpenCode assets", () => {
	it("uses documented instruction files instead of system transform injection", () => {
		const plugin = read("opencode/templates/plugins/openagentsbtw.ts");
		assert.match(plugin, /"tool\.execute\.before"/);
		assert.equal(plugin.includes("experimental.chat.system.transform"), false);
	});

	it("ships a managed OpenCode instruction file", () => {
		const instructions = read(
			"opencode/templates/instructions/openagentsbtw.md",
		);
		assert.match(instructions, /## Working Rules/);
		assert.match(instructions, /## Guardrails/);
	});

	it("ships an OpenCode hook manifest that includes plugin and git-hook surfaces", () => {
		const manifest = read("opencode/templates/hooks/HOOKS.md");
		assert.match(manifest, /plugin: event `tool\.execute\.before`/);
		assert.match(manifest, /git-hook: `pre-commit`/);
		assert.match(manifest, /git-hook: `pre-push`/);
	});
});

describe("generated hook manifests", () => {
	it("makes Codex unsupported shared policies explicit", () => {
		const manifest = read("codex/hooks/HOOKS.md");
		assert.match(manifest, /`write-quality`:/);
		assert.match(manifest, /`subagent-scan`:/);
	});

	it("emits machine-readable policy maps per platform", () => {
		const codex = JSON.parse(read("codex/hooks/policy-map.json"));
		const opencode = JSON.parse(
			read("opencode/templates/hooks/policy-map.json"),
		);
		assert.ok(
			codex.some(
				(entry) => entry.id === "bash-guard" && entry.status === "supported",
			),
		);
		assert.ok(
			codex.some(
				(entry) =>
					entry.id === "write-quality" && entry.status === "unsupported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) => entry.id === "bash-guard" && entry.status === "supported",
			),
		);
		assert.ok(
			opencode.some(
				(entry) =>
					entry.id === "prompt-git-context" && entry.status === "unsupported",
			),
		);
	});
});
