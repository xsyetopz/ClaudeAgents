import { describe, expect, test } from "bun:test";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL prompt layer rendering", () => {
	test("renders Codex layered project and agent instructions", async () => {
		const bundle = await renderSurfaceBundle("codex");
		const agentsMd = artifactContent(bundle, "AGENTS.md");
		const athena = artifactContent(bundle, ".codex/agents/athena.toml");

		expect(agentsMd).toContain("## OAL Prompt Layers");
		expect(athena).toContain("### Completion contract");
		expect(() => Bun.TOML.parse(athena ?? "")).not.toThrow();
	});

	test("renders Claude real instruction file and layered command content", async () => {
		const bundle = await renderSurfaceBundle("claude");
		const claudeMd = artifactContent(bundle, "CLAUDE.md");
		const plan = artifactContent(bundle, ".claude/commands/plan.md");

		expect(artifactPaths(bundle)).toContain("CLAUDE.md");
		expect(claudeMd).toContain("OpenAgentLayer Claude Instructions");
		expect(plan).toContain("## OAL Prompt Layers");
	});

	test("renders OpenCode instruction file and config entry", async () => {
		const bundle = await renderSurfaceBundle("opencode");
		const config = artifactContent(bundle, "opencode.json");
		const instructions = artifactContent(
			bundle,
			".opencode/openagentlayer/instructions.md",
		);

		expect(config).toContain('"instructions"');
		expect(instructions).toContain("OpenAgentLayer OpenCode Instructions");
	});
});
