import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadSource } from "../src";

const repoRoot = resolve(import.meta.dir, "../../..");

test("loadSource hydrates upstream skills verbatim", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	const caveman = graph.source.skills.find((skill) => skill.id === "caveman");
	const taste = graph.source.skills.find((skill) => skill.id === "taste");
	expect(caveman?.body).toBe(
		await readFile(
			resolve(repoRoot, "third_party/caveman/skills/caveman/SKILL.md"),
			"utf8",
		),
	);
	expect(taste?.body).toBe(
		await readFile(
			resolve(repoRoot, "third_party/taste-skill/skills/taste-skill/SKILL.md"),
			"utf8",
		),
	);
});

test("loadSource reports provenance for authored records", async () => {
	const graph = await loadSource(resolve(repoRoot, "source"));
	expect(graph.provenance.get("skill:caveman")).toContain(
		"source/skills/caveman.json",
	);
	expect(graph.agentIds.has("hephaestus")).toBe(true);
});
