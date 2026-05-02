import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadSource } from "@openagentlayer/source";
import { renderProvider } from "../src";
import { OPENCODE_MODEL_FALLBACKS } from "../src/opencode";

const repoRoot = resolve(import.meta.dir, "../../..");

test("OpenCode config renders OAL fallback models", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const rendered = await renderProvider("opencode", graph.source, repoRoot);
	const config = JSON.parse(
		stripJsonComments(
			rendered.artifacts.find((artifact) => artifact.path === "opencode.jsonc")
				?.content ?? "{}",
		),
	) as { model: string; small_model: string; model_fallbacks: string[] };
	expect(config.model).toBe(OPENCODE_MODEL_FALLBACKS[0]);
	expect(config.small_model).toBe(OPENCODE_MODEL_FALLBACKS[1]);
	expect(config.model_fallbacks).toEqual([...OPENCODE_MODEL_FALLBACKS]);
});

test("provider skill artifacts preserve upstream skill bytes", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	for (const [skill, upstream] of [
		["caveman", "third_party/caveman/skills/caveman/SKILL.md"],
		["taste", "third_party/taste-skill/skills/taste-skill/SKILL.md"],
	] as const) {
		const upstreamBody = await readFile(resolve(repoRoot, upstream), "utf8");
		for (const provider of ["codex", "claude", "opencode"] as const) {
			const rendered = await renderProvider(provider, graph.source, repoRoot);
			const artifact = rendered.artifacts.find((candidate) =>
				candidate.path.endsWith(`/${skill}/SKILL.md`),
			);
			expect(artifact?.content).toBe(upstreamBody);
		}
	}
});

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
