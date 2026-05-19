import { describe, expect, test } from "bun:test";
import {
	createSkillRegistry,
	type IndexedSkill,
	loadSelectedSkills,
	type SkillIndexMetadata,
	selectTopicalSkills,
} from "authoring";
import {
	applyWorkerResult,
	createGoalLoopState,
	planGoalStep,
	recoverGoalContinuation,
	requestGoalCompletion,
} from "lifecycle";
import { policyPreActionHook, runHookPipeline } from "safety";

describe("Olympi goal-loop engine", () => {
	test("blocked loop pauses instead of continuing unrelated work", () => {
		const initial = createGoalLoopState({
			objective: "Ship migration",
			acceptanceCriteria: ["tests pass"],
			verificationCommands: ["bun test"],
			maxAttemptsPerStep: 3,
		});
		const planned = planGoalStep(initial, "Run integration tests", {
			id: "validate",
		});
		const transition = applyWorkerResult(planned, {
			stepId: "validate",
			summary: "Blocked: missing API key credential for live test account",
			evidence: ["test output requested LIVE_API_KEY"],
		});

		expect(transition.action).toBe("pause");
		expect(transition.state.status).toBe("blocked");
		expect(transition.blocker?.kind).toBe("credentials");
		expect(transition.reasons.join("\n")).toContain(
			"provide the missing credential",
		);

		const afterBlocker = planGoalStep(
			transition.state,
			"Do unrelated cleanup while blocked",
			{ id: "unrelated" },
		);
		expect(afterBlocker.steps.find((step) => step.id === "unrelated")).toBe(
			undefined,
		);
		expect(afterBlocker.ledger.at(-1)?.detail).toContain("planning paused");
	});

	test("ambiguous ownership blocker pauses goal loop", () => {
		const initial = createGoalLoopState({
			objective: "Safely repair project config",
			acceptanceCriteria: ["config ownership is proven"],
			verificationCommands: ["git status --short"],
		});
		const planned = planGoalStep(initial, "Restore config file", {
			id: "restore",
		});
		const transition = applyWorkerResult(planned, {
			stepId: "restore",
			summary:
				"Ambiguous workspace ownership for .pi/settings.json; ownership proof is missing",
			evidence: ["git status showed pre-existing modification"],
		});

		expect(transition.action).toBe("pause");
		expect(transition.blocker?.kind).toBe("ambiguous-ownership");
		expect(transition.blocker?.requiredAction).toContain("provenance");
	});

	test("completion requires explicit verification and audit evidence", () => {
		const state = createGoalLoopState({
			objective: "Complete package refactor",
			acceptanceCriteria: ["domain packages compile"],
			verificationCommands: ["bun run typecheck"],
		});

		const denied = requestGoalCompletion(state, {
			completedRequirements: ["domain packages compile"],
			verification: [],
			completionAuditComplete: false,
		});

		expect(denied.action).toBe("continue");
		expect(denied.state.status).toBe("active");
		expect(denied.reasons.join("\n")).toContain(
			"verification command has not passed",
		);
		expect(denied.reasons.join("\n")).toContain("completion audit");

		const completed = requestGoalCompletion(state, {
			completedRequirements: ["domain packages compile"],
			verification: [{ command: "bun run typecheck", exitCode: 0 }],
			completionAuditComplete: true,
		});
		expect(completed.action).toBe("complete");
		expect(completed.state.status).toBe("completed");
	});

	test("completion rejects unintended diff files and unresolved blockers", () => {
		const state = createGoalLoopState({
			objective: "Harden active policy path",
			acceptanceCriteria: ["policy path is active"],
			verificationCommands: ["bun run olympi:test"],
		});

		const denied = requestGoalCompletion(state, {
			completedRequirements: ["policy path is active"],
			verification: [{ command: "bun run olympi:test", exitCode: 0 }],
			completionAuditComplete: true,
			intendedChangedFiles: [
				"packages/safety/src/policy/workspace-ownership.ts",
			],
			observedChangedFiles: [
				"packages/safety/src/policy/workspace-ownership.ts",
				".pi/settings.json",
			],
			unresolvedBlockers: ["ambiguous .pi/settings.json ownership"],
		});

		expect(denied.action).toBe("continue");
		expect(denied.reasons.join("\n")).toContain("unintended file");
		expect(denied.reasons.join("\n")).toContain("unresolved blocker");
	});

	test("continuation recovery preserves objective and completion audit", () => {
		const state = createGoalLoopState({
			objective: "Port useful OAL legacy hooks into Olympi packages",
			completionAuditRequirements: ["verify every required test passes"],
		});
		const recovered = recoverGoalContinuation(
			state,
			"The previous agent was about to run tests",
		);

		expect(recovered.objective.objective).toBe(
			"Port useful OAL legacy hooks into Olympi packages",
		);
		expect(recovered.continuation.objectivePreserved).toBe(true);
		expect(recovered.continuation.completionAuditPreserved).toBe(true);
		expect(recovered.continuation.recoveredPrompt).toContain(
			"verify every required test passes",
		);
	});
});

describe("Olympi hook and skill systems", () => {
	test("pre-action hooks can veto unsafe actions", () => {
		const result = runHookPipeline(
			{
				schemaVersion: 1,
				phase: "pre-action",
				toolName: "bash",
				operation: "execute",
				command: "rm -rf ~/.pi",
			},
			[policyPreActionHook()],
		);

		expect(result.vetoed).toBe(true);
		expect(result.decision).toBe("veto");
		expect(result.reasons.join("\n")).toContain("recursive force delete");
	});

	test("skills are selected topically and lazily loaded", async () => {
		let debugLoaded = 0;
		let implementationLoaded = 0;
		const debug = indexedSkill(
			"systemic-debugging",
			["debug", "blocker"],
			() => {
				debugLoaded += 1;
				return "debug body";
			},
		);
		const implement = indexedSkill(
			"implementation-worker",
			["implement", "edit"],
			() => {
				implementationLoaded += 1;
				return "implementation body";
			},
		);
		const registry = createSkillRegistry([debug, implement]);

		const selected = selectTopicalSkills(registry, {
			text: "We are blocked by a failing environment and need root cause debug",
			limit: 1,
		});

		expect(selected).toHaveLength(1);
		expect(selected[0]?.metadata.name).toBe("systemic-debugging");
		expect(debugLoaded).toBe(0);
		expect(implementationLoaded).toBe(0);

		const loaded = await loadSelectedSkills(selected);
		expect(loaded[0]?.body).toBe("debug body");
		expect(debugLoaded).toBe(1);
		expect(implementationLoaded).toBe(0);
	});
});

function indexedSkill(
	name: string,
	triggers: string[],
	body: () => string,
): IndexedSkill {
	const metadata: SkillIndexMetadata = {
		schemaVersion: 1,
		name,
		title: name,
		description: `${name} description`,
		topics: triggers,
		triggers,
		modelTier: "cheap-worker",
		supportFiles: [],
		verificationCommands: [],
	};
	return {
		metadata,
		load() {
			return {
				metadata,
				body: body(),
				supportFiles: [],
				digest: `test:${name}`,
			};
		},
	};
}
