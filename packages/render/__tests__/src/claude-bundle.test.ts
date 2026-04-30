import { describe, expect, test } from "bun:test";
import {
	artifactContent,
	artifactPaths,
	renderSurfaceBundle,
} from "../_helpers/registry";

describe("OAL Claude bundle rendering", () => {
	test("renders native artifacts and settings", async () => {
		const bundle = await renderSurfaceBundle("claude");
		const settings = artifactContent(bundle, ".claude/settings.json");

		expect(artifactPaths(bundle)).toContain(".claude/agents/athena.md");
		expect(artifactPaths(bundle)).toContain(".claude/settings.json");
		expect(settings).toContain(
			"bun .claude/openagentlayer/runtime/completion-gate.mjs",
		);
		expect(settings).toContain("UserPromptSubmit");
		expect(() => JSON.parse(settings ?? "")).not.toThrow();
		for (const artifact of bundle.artifacts) {
			expect(artifact.content).not.toContain("openagentsbtw");
		}
	});
});
