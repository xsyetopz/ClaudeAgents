import { describe, expect, test } from "bun:test";
import { hasErrors } from "@openagentlayer/diagnostics";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeCommand,
	writePolicy,
	writeSkill,
} from "@openagentlayer/testkit";

describe("OAL source record validation", () => {
	test("fails unknown surface", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["codex", "unknown-surface"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-surface",
		);
	});

	test("fails missing body file", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { prompt: "missing.md" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-body",
		);
	});

	test("fails duplicate IDs", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { id: "duplicate" });
		await writeAgent(root, {
			directory: "agents/duplicate-two",
			id: "duplicate",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-id",
		);
	});

	test("fails unknown route contract", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { routeContract: "mystery-route" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-route-contract",
		);
	});

	test("fails unknown model policy", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { modelPolicy: "bad-model" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-policy",
		);
	});

	test.each([
		"gpt-5.2",
		"gpt-5.3-codex",
	])("accepts managed Codex model id %s", async (modelPolicy) => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { modelPolicy });

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.skills[0]?.model_policy).toBe(modelPolicy);
	});

	test("fails unknown policy reference", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, { hookPolicies: '["missing-policy"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-policy-reference",
		);
	});

	test("fails invalid policy field types", async () => {
		const root = await createFixtureRoot();
		await writePolicy(root, {
			surfaceEvents: '"Stop"',
			surfaceMappings: '"Stop"',
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-object",
		);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-array",
		);
	});

	test("fails agent missing handoff contract", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		const agentPath = `${root}/source/agents/duplicate-one/agent.toml`;
		const source = await Bun.file(agentPath).text();
		await Bun.write(
			agentPath,
			source.replace(
				'handoff_contract = "result-evidence-blockers-files-next-action"\n',
				"",
			),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-handoff-contract",
		);
	});
});
