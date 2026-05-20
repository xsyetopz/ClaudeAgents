import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	buildRepoMap,
	planSavedGoal,
	planSavedGoalTeam,
	readFeedbackReport,
	recordFeedbackItem,
	refreshRepoMap,
	startGoalWorkflow,
} from "lifecycle";
import { buildHandoffReport, buildStatusReport } from "reporting";
import {
	decideHostBrokerFixture,
	decideHostBrokerRequest,
	validateProviderFixture,
} from "safety";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");
const FIXTURES = path.join(import.meta.dir, "fixtures");
const PARSER_PATTERN = /typescript-ast|tree-sitter/;

describe("Olympi product capability contracts", () => {
	test("repo map analyzes a TypeScript fixture and falls back safely when LSP is unavailable", async () => {
		const root = await fixtureProject();
		try {
			const map = await refreshRepoMap(root);
			expect(map.statePath).toBe(".pi/olympi/code-intelligence/repo-map.json");
			expect(map.files.some((file) => file.path === "src/index.ts")).toBe(true);
			expect(
				map.files.find((file) => file.path === "src/index.ts")?.publicSymbols,
			).toContain("run");
			expect(map.contextPacket.length).toBeLessThanOrEqual(1800);
			expect(map.engine.parser).toMatch(PARSER_PATTERN);
			if (map.engine.lsp === "unavailable")
				expect(map.engine.lspDetail).toContain("no language server");
			const persisted = JSON.parse(
				await readFile(path.join(root, map.statePath), "utf8"),
			);
			expect(persisted.projectRoot).toBe(root);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("goal planning and team planning consume repo-map hints and block unsafe ownership paths", async () => {
		const root = await fixtureProject();
		try {
			await refreshRepoMap(root);
			const started = await startGoalWorkflow({
				projectRoot: root,
				objective: "ship fixture",
				save: true,
			});
			const firstPlan = await planSavedGoal({
				projectRoot: root,
				goalId: started.goalId,
				step: "update src/index.ts",
				save: true,
			});
			expect(firstPlan.codeIntelligence.contextHints.join("\n")).toContain(
				"src/index.ts",
			);
			const secondPlan = await planSavedGoal({
				projectRoot: root,
				goalId: started.goalId,
				step: "update src/index.test.ts",
				save: true,
			});
			const team = await planSavedGoalTeam({
				projectRoot: root,
				goalId: started.goalId,
				assignments: [
					{
						stepId: firstPlan.state.steps.at(-1)?.id ?? "missing",
						allowedPaths: ["src/index.ts"],
					},
					{
						stepId: secondPlan.state.steps.at(-1)?.id ?? "missing",
						allowedPaths: [".pi/settings.json"],
					},
				],
			});
			expect(team.blocked).toBe(true);
			expect(team.reason).toContain("unsafe ownership path");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("internal provider-event fixtures validate policy event shapes only", async () => {
		const report = await validateProviderFixture(
			path.join(FIXTURES, "provider-tool-call.json"),
		);
		expect(report.valid).toBe(true);
		expect(report.adapter.launchesProvider).toBe(false);
		expect(report.policyEvent?.eventType).toBe("tool_call");
		const approval = await validateProviderFixture(
			path.join(FIXTURES, "provider-approval-required.json"),
		);
		expect(approval.valid).toBe(true);
		expect(approval.policyEvent?.eventType).toBe("before_provider_request");
	});

	test("internal executable-resource gate denies live/process requests", async () => {
		const allowed = await decideHostBrokerFixture(
			path.join(FIXTURES, "host-broker-allow.json"),
		);
		expect(allowed.allowed).toBe(true);
		expect(allowed.liveExecution).toBe(false);
		const denied = await decideHostBrokerFixture(
			path.join(FIXTURES, "host-broker-deny-live.json"),
		);
		expect(denied.allowed).toBe(false);
		expect(denied.reasons.join("\n")).toContain("not a product surface");
		const direct = decideHostBrokerRequest({
			schemaVersion: 1,
			resourceId: "bad",
			mode: "dry-run",
			capabilities: ["process"],
			process: { allow: true },
		});
		expect(direct.allowed).toBe(false);
	});

	test("feedback records are classified concrete product work, not vague roadmap text", async () => {
		const root = await fixtureProject();
		try {
			const item = await recordFeedbackItem(root, {
				source: "provider-broker-gap",
				observedProblem: "provider adapter contract needs fixture coverage",
				evidence: ["missing event schema test"],
				affected: ["packages/safety/src/provider/contract.ts"],
			});
			expect(item.classification).toBe("provider contract gap");
			expect(item.status).toBe("blocked with concrete reason");
			expect(item.statusReason).toContain("missing event schema test");
			const report = await readFeedbackReport(root);
			expect(report.openConcreteBlockers).toHaveLength(1);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("reports include code intelligence and feedback status without provider or host-broker product claims", async () => {
		const root = await fixtureProject();
		try {
			await buildRepoMap(root);
			await recordFeedbackItem(root, {
				source: "code-intelligence-gap",
				observedProblem: "repo-map hint missing",
				evidence: ["fixture"],
				affected: ["packages/lifecycle/src/code-intelligence.ts"],
			});
			const status = await buildStatusReport(root);
			expect(status.codeIntelligence.engine.parser).toMatch(PARSER_PATTERN);
			expect("provider" in status).toBe(false);
			expect("hostBroker" in status).toBe(false);
			expect(status.feedback.items).toBe(1);
			const handoff = await buildHandoffReport(root);
			expect(handoff.markdown).toContain("Code intelligence");
			expect(handoff.markdown).not.toContain("Provider and host broker");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("public docs, help, catalog, and reports do not expose provider runtime or host-broker half-capabilities", async () => {
		const publicDocs = [
			"SECURITY.md",
			"README.md",
			"docs/security.md",
			"docs/product-surface.md",
			"specs/security.md",
			"specs/product.md",
		];
		const forbidden = [
			"fixture-stub",
			"dry-run host broker",
			"dry-run-only",
			"not launched",
			"not claim",
			"does not claim",
			"limited to",
		];
		for (const relativePath of publicDocs) {
			const text = await readFile(
				path.join(import.meta.dir, "..", "..", "..", relativePath),
				"utf8",
			);
			const lower = text.toLowerCase();
			for (const phrase of forbidden) expect(lower).not.toContain(phrase);
		}
		const help = Bun.spawn(["bun", CLI, "help", "all"], { stdout: "pipe" });
		const [stdout, exitCode] = await Promise.all([
			new Response(help.stdout).text(),
			help.exited,
		]);
		expect(exitCode).toBe(0);
		expect(stdout).not.toContain("dev provider");
		expect(stdout).not.toContain("broker host");
	});

	test("developer code-intelligence refresh writes only project-local state", async () => {
		const root = await fixtureProject();
		const home = await mkdtemp(path.join(os.tmpdir(), "olympi-home-"));
		try {
			const proc = Bun.spawn(
				["bun", CLI, "dev", "intelligence", "refresh", "--json"],
				{
					cwd: root,
					env: { ...process.env, HOME: home },
					stdout: "pipe",
					stderr: "pipe",
				},
			);
			const [stdout, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout).statePath).toBe(
				".pi/olympi/code-intelligence/repo-map.json",
			);
			expect(await Bun.file(path.join(home, ".pi")).exists()).toBe(false);
			expect(
				await Bun.file(
					path.join(root, ".pi/olympi/code-intelligence/repo-map.json"),
				).exists(),
			).toBe(true);
		} finally {
			await rm(root, { recursive: true, force: true });
			await rm(home, { recursive: true, force: true });
		}
	});
});

async function fixtureProject(): Promise<string> {
	const root = await mkdtemp(path.join(os.tmpdir(), "olympi-fixture-project-"));
	await mkdir(path.join(root, "src"), { recursive: true });
	await writeFile(
		path.join(root, "package.json"),
		JSON.stringify(
			{
				name: "fixture",
				scripts: { test: "bun test" },
				exports: "./src/index.ts",
			},
			null,
			2,
		),
	);
	await writeFile(
		path.join(root, "src/index.ts"),
		'export function run(value: string): string { return value.toUpperCase(); }\nimport { helper } from "./util";\nexport { helper };\n',
	);
	await writeFile(path.join(root, "src/util.ts"), "export const helper = 1;\n");
	await writeFile(
		path.join(root, "src/index.test.ts"),
		'import { run } from "./index";\n',
	);
	return root;
}
