import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	claimIssue,
	codexLaunchCommand,
	createOrchestratorState,
	eligibleIssues,
	ensureWorkspace,
	type Issue,
	parseWorkflow,
	renderPrompt,
	resolveConfig,
	SymphonyService,
	type SymphonyTrackerClient,
	scheduleRetry,
} from "../src";

const baseIssue: Issue = {
	id: "1",
	identifier: "ABC-1",
	title: "Fix it",
	description: null,
	priority: 2,
	state: "Todo",
	branch_name: null,
	url: null,
	labels: ["bug"],
	blocked_by: [],
	created_at: "2026-05-01T00:00:00Z",
	updated_at: null,
};

test("workflow loader parses front matter and resolves typed defaults", () => {
	const workflow = parseWorkflow(`---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: OAL
workspace:
  root: ./work
agent:
  max_concurrent_agents: 2
  max_concurrent_agents_by_state:
    Todo: 1
codex:
  command: codex app-server --profile openagentlayer
---
Work on {{ issue.identifier }}: {{ issue.title }}
`);
	const config = resolveConfig(
		{ ...workflow, path: "/repo/WORKFLOW.md" },
		{ LINEAR_API_KEY: "lin_api" },
	);
	expect(config.tracker.endpoint).toBe("https://api.linear.app/graphql");
	expect(config.workspace.root).toBe("/repo/work");
	expect(config.agent.max_concurrent_agents).toBe(2);
	expect(config.agent.max_concurrent_agents_by_state["todo"]).toBe(1);
	expect(config.codex.command).toBe(
		"codex app-server --profile openagentlayer",
	);
	expect(renderPrompt(workflow.prompt_template, baseIssue, null)).toContain(
		"ABC-1",
	);
});

test("scheduler filters claimed, blocked, inactive, and over-limit issues", () => {
	const workflow = parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
agent:
  max_concurrent_agents: 2
  max_concurrent_agents_by_state:
    Todo: 1
---`);
	const config = resolveConfig(workflow, {});
	const state = createOrchestratorState(config);
	const running = { ...baseIssue, id: "running", identifier: "ABC-0" };
	state.running.set(running.id, {
		issue: running,
		started_at: 0,
		last_codex_timestamp: null,
	});
	claimIssue(state, { ...baseIssue, id: "claimed", identifier: "ABC-9" });
	const blocked = {
		...baseIssue,
		id: "blocked",
		identifier: "ABC-2",
		blocked_by: [
			{
				id: "b",
				identifier: "ABC-0",
				state: "Todo",
				created_at: null,
				updated_at: null,
			},
		],
	};
	const candidates = eligibleIssues(
		[
			blocked,
			{ ...baseIssue, id: "done", identifier: "ABC-3", state: "Done" },
			{
				...baseIssue,
				id: "next",
				identifier: "ABC-4",
				state: "In Progress",
				priority: 1,
			},
			{ ...baseIssue, id: "claimed", identifier: "ABC-9" },
		],
		config,
		state,
	);
	expect(candidates.map((issue) => issue.identifier)).toEqual(["ABC-4"]);
});

test("workspace manager sanitizes keys and runs create hook once", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-"));
	try {
		const config = resolveConfig(
			parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
workspace:
  root: ${root}
hooks:
  after_create: echo created
---`),
			{},
		);
		const calls: string[] = [];
		const issue = { ...baseIssue, identifier: "ABC/123" };
		const first = await ensureWorkspace(config, issue, (script, cwd) => {
			calls.push(`${script}:${cwd}`);
			return Promise.resolve();
		});
		const second = await ensureWorkspace(config, issue, (script, cwd) => {
			calls.push(`${script}:${cwd}`);
			return Promise.resolve();
		});
		expect(first.workspace_key).toBe("ABC_123");
		expect(first.created_now).toBe(true);
		expect(second.created_now).toBe(false);
		expect(calls).toHaveLength(1);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("retry and codex command contracts match Symphony spec defaults", () => {
	const config = resolveConfig(
		parseWorkflow(`---
tracker:
  kind: linear
  api_key: key
  project_slug: OAL
---`),
		{},
	);
	expect(scheduleRetry(config, baseIssue, 1, 1000, null).due_at_ms).toBe(2000);
	expect(scheduleRetry(config, baseIssue, 2, 1000, "failed").due_at_ms).toBe(
		21000,
	);
	expect(codexLaunchCommand(config)).toEqual({
		command: "bash",
		args: ["-lc", "codex app-server"],
	});
});

test("service reloads workflow, dispatches workers, records totals, and queues continuation", async () => {
	const root = await mkdtemp(join(tmpdir(), "symphony-service-"));
	try {
		const workflowPath = join(root, "WORKFLOW.md");
		await writeFile(
			workflowPath,
			`---
tracker:
  kind: linear
  api_key: local
  project_slug: OAL
workspace:
  root: ${root}
agent:
  max_concurrent_agents: 1
  max_turns: 1
---
Handle {{ issue.identifier }}
`,
		);
		const issue = { ...baseIssue, state: "In Progress" };
		const tracker: SymphonyTrackerClient = {
			fetchCandidateIssues() {
				return Promise.resolve([issue]);
			},
			fetchIssueStates() {
				return Promise.resolve([{ ...issue, state: "Done" }]);
			},
			fetchTerminalIssues() {
				return Promise.resolve([]);
			},
		};
		const prompts: string[] = [];
		const service = new SymphonyService({
			workflowPath,
			tracker,
			runner: {
				run(input) {
					prompts.push(input.prompt);
					return Promise.resolve({
						status: "succeeded",
						input_tokens: 10,
						output_tokens: 2,
						total_tokens: 12,
					});
				},
			},
		});
		await service.tick();
		await service.drain();
		expect(prompts).toEqual(["Handle ABC-1"]);
		expect(service.state.codex_totals.total_tokens).toBe(12);
		expect(service.state.completed.has(issue.id)).toBe(true);
		expect(service.state.retry_attempts.get(issue.id)?.error).toBeNull();
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
