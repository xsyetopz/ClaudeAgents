import { describe, expect, test } from "bun:test";
import { hasErrors } from "@openagentlayer/diagnostics";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeModelPlan,
} from "@openagentlayer/testkit";

describe("OAL source model-plan validation", () => {
	test("loads valid model plan records", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root);

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.modelPlans[0]?.role_assignments[0]).toEqual({
			effort: "medium",
			model: "gpt-5.4",
			role: "fixture-agent",
		});
	});

	test("fails invalid model plan model", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { defaultModel: "bad-model" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-plan-model",
		);
	});

	test("fails invalid model plan id", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { id: "fixture-plan" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-plan-id",
		);
	});

	test("fails invalid model plan effort", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { effort: "ultra" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-plan-effort",
		);
	});

	test("fails unknown model plan role assignment", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { assignedRole: "missing-agent" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-role-assignment",
		);
	});

	test("fails duplicate default model plans for one surface", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { defaultPlan: true, id: "codex-plus" });
		await writeModelPlan(root, { defaultPlan: true, id: "codex-pro-5" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-default-model-plan",
		);
	});
});
