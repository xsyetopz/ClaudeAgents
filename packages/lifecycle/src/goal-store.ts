import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	buildRepoMap,
	type CodeIntelligenceRepoMap,
	codeContextForPaths,
	readRepoMap,
} from "./code-intelligence.js";
import {
	completionEvidenceFromState,
	createGoalLoopState,
	type GoalCompletionEvidence,
	type GoalLoopState,
	type GoalTeamAssignmentInput,
	type GoalTeamPlan,
	type GoalVerificationRecord,
	planGoalStep,
	planGoalTeam,
	recoverGoalContinuation,
	requestGoalCompletion,
} from "./goal-loop.js";
import { OlympiError } from "./types.js";

const GOAL_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const PATH_HINT_SPLIT_PATTERN = /\s+/;
const PATH_HINT_BOUNDARY_PATTERN = /^[`'"(]+|[`'"),.]+$/g;

/** Options for preparing or saving a project-local goal workflow state file. */
export interface GoalStartOptions {
	projectRoot?: string;
	objective: string;
	verificationCommands?: string[];
	stopConditions?: string[];
	save?: boolean;
	mode?: "human-present" | "autonomous";
	autonomousConfirmed?: boolean;
	createdAt?: string;
}

/** Report produced when a goal workflow is prepared or saved. */
export interface GoalStartReport {
	schemaVersion: 1;
	command: "goal";
	mode: "human-present" | "autonomous";
	saved: boolean;
	goalId: string;
	goal: string;
	statePath: string;
	wouldWrite: string[];
	written: string[];
	blocked: boolean;
	reason: string;
	state: GoalLoopState;
}

/** Options for appending a reviewable planned step to saved goal state. */
export interface GoalPlanOptions {
	projectRoot?: string;
	goalId: string;
	step: string;
	save?: boolean;
}

/** Report produced when saved goal state is planned forward. */
export interface GoalPlanReport {
	schemaVersion: 1;
	command: "goal plan";
	goalId: string;
	statePath: string;
	saved: boolean;
	wouldWrite: string[];
	written: string[];
	blocked: boolean;
	reason: string;
	beforeStepCount: number;
	afterStepCount: number;
	codeIntelligence: GoalCodeIntelligenceSummary;
	state: GoalLoopState;
}

/** Options for recording a bounded team orchestration plan in saved state. */
export interface GoalTeamOptions {
	projectRoot?: string;
	goalId: string;
	assignments: GoalTeamAssignmentInput[];
	maxWorkers?: number;
	save?: boolean;
}

/** Report produced when a saved goal receives a bounded team plan. */
export interface GoalTeamReport {
	schemaVersion: 1;
	command: "goal team";
	goalId: string;
	statePath: string;
	saved: boolean;
	wouldWrite: string[];
	written: string[];
	blocked: boolean;
	reason: string;
	plan: GoalTeamPlan;
	codeIntelligence: GoalCodeIntelligenceSummary;
	state: GoalLoopState;
}

export interface GoalCodeIntelligenceSummary {
	statePath: string;
	parser: string;
	lsp: "available" | "unavailable";
	contextHints: string[];
}

/** Options for reconstructing continuation context from a saved goal. */
export interface GoalResumeOptions {
	projectRoot?: string;
	goalId: string;
	compactionSummary?: string;
	save?: boolean;
}

/** Report produced when a saved goal is prepared for continuation. */
export interface GoalResumeReport {
	schemaVersion: 1;
	command: "goal resume";
	goalId: string;
	statePath: string;
	saved: boolean;
	wouldWrite: string[];
	written: string[];
	blocked: boolean;
	reason: string;
	resumePrompt: string;
	beforeStatus: GoalLoopState["status"];
	afterStatus: GoalLoopState["status"];
	activeBlocker: GoalLoopState["activeBlocker"];
	state: GoalLoopState;
}

/** Options for completing a saved goal through the verification gate. */
export interface GoalCompleteOptions {
	projectRoot?: string;
	goalId: string;
	completedRequirements?: string[];
	verification?: GoalVerificationRecord[];
	completionAuditComplete: boolean;
	intendedChangedFiles?: string[];
	observedChangedFiles?: string[];
	save?: boolean;
}

/** Report produced when saved goal completion is requested. */
export interface GoalCompleteReport {
	schemaVersion: 1;
	command: "goal complete";
	goalId: string;
	statePath: string;
	saved: boolean;
	wouldWrite: string[];
	written: string[];
	completed: boolean;
	blocked: boolean;
	reason: string;
	evidence: GoalCompletionEvidence;
	state: GoalLoopState;
}

/** Prepare a goal-loop state and optionally save it under `.pi/olympi/goals`. */
export async function startGoalWorkflow(
	options: GoalStartOptions,
): Promise<GoalStartReport> {
	const mode = options.mode ?? "human-present";
	const createOptions = {
		objective: options.objective,
		...(options.createdAt === undefined
			? {}
			: { createdAt: options.createdAt }),
		...(options.verificationCommands === undefined
			? {}
			: { verificationCommands: options.verificationCommands }),
		...(options.stopConditions === undefined
			? {}
			: { stopConditions: options.stopConditions }),
	};
	const initial = createGoalLoopState(createOptions);
	const state = planGoalStep(
		planGoalStep(initial, "Inspect current project state and constraints"),
		"Perform only the requested work, then collect verification evidence",
	);
	const statePath = path.posix.join(
		".pi",
		"olympi",
		"goals",
		`${state.objective.id}.json`,
	);
	const report: GoalStartReport = {
		schemaVersion: 1,
		command: "goal",
		mode,
		saved: false,
		goalId: state.objective.id,
		goal: state.objective.objective,
		statePath,
		wouldWrite: [statePath],
		written: [],
		blocked: false,
		reason:
			"goal state prepared; rerun with --save to write project-local state",
		state,
	};
	if (mode === "autonomous" && options.autonomousConfirmed !== true) {
		return {
			...report,
			blocked: true,
			reason:
				"autonomous goal mode requires explicit --confirm-autonomous and still only saves goal state",
		};
	}
	if (options.save !== true) return report;
	await writeGoalState(
		path.resolve(options.projectRoot ?? process.cwd()),
		statePath,
		state,
	);
	return {
		...report,
		saved: true,
		wouldWrite: [],
		written: [statePath],
		reason: "goal state saved for human-present workflow tracking",
	};
}

/** Add a bounded, reviewable step to a saved goal; write only with `save`. */
export async function planSavedGoal(
	options: GoalPlanOptions,
): Promise<GoalPlanReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const statePath = goalStatePath(options.goalId);
	const before = await readGoalState(projectRoot, options.goalId);
	const codeIntelligence = await goalCodeIntelligenceSummary(
		projectRoot,
		extractPathHints(options.step),
	);
	const state = planGoalStep(before, options.step);
	const blocked = state.steps.length === before.steps.length;
	const report: GoalPlanReport = {
		schemaVersion: 1,
		command: "goal plan",
		goalId: options.goalId,
		statePath,
		saved: false,
		wouldWrite: [statePath],
		written: [],
		blocked,
		reason: blocked
			? "goal planning paused because the saved goal has an active blocker"
			: "goal plan prepared; rerun with --save to update project-local state",
		beforeStepCount: before.steps.length,
		afterStepCount: state.steps.length,
		codeIntelligence,
		state,
	};
	if (blocked || options.save !== true) return report;
	await writeGoalState(projectRoot, statePath, state);
	return {
		...report,
		saved: true,
		wouldWrite: [],
		written: [statePath],
		reason: "goal plan saved to project-local state",
	};
}

/** Record a bounded team plan for independent saved steps; write only with `save`. */
export async function planSavedGoalTeam(
	options: GoalTeamOptions,
): Promise<GoalTeamReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const statePath = goalStatePath(options.goalId);
	const before = await readGoalState(projectRoot, options.goalId);
	const repoMap = await loadOrBuildRepoMap(projectRoot);
	const codeContextByStep = Object.fromEntries(
		options.assignments.map((assignment) => [
			assignment.stepId,
			codeContextForPaths(repoMap, assignment.allowedPaths),
		]),
	);
	const result = planGoalTeam(before, {
		assignments: options.assignments,
		...(options.maxWorkers === undefined
			? {}
			: { maxWorkers: options.maxWorkers }),
		codeContextByStep,
	});
	const codeIntelligence = summarizeRepoMap(
		repoMap,
		Object.values(codeContextByStep).flat(),
	);
	const report: GoalTeamReport = {
		schemaVersion: 1,
		command: "goal team",
		goalId: options.goalId,
		statePath,
		saved: false,
		wouldWrite: result.blocked ? [] : [statePath],
		written: [],
		blocked: result.blocked,
		reason: result.reasons.join("; "),
		plan: result.plan,
		codeIntelligence,
		state: result.state,
	};
	if (result.blocked || options.save !== true) return report;
	await writeGoalState(projectRoot, statePath, result.state);
	return {
		...report,
		saved: true,
		wouldWrite: [],
		written: [statePath],
		reason: "bounded team orchestration plan saved to project-local state",
	};
}

/** Rebuild continuation context from saved state; write only with `save`. */
export async function resumeSavedGoal(
	options: GoalResumeOptions,
): Promise<GoalResumeReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const statePath = goalStatePath(options.goalId);
	const before = await readGoalState(projectRoot, options.goalId);
	const blocked = before.status === "blocked" && before.activeBlocker !== null;
	const state = recoverGoalContinuation(
		before,
		options.compactionSummary ?? "resume requested from saved goal state",
	);
	const resumePrompt = state.continuation.recoveredPrompt ?? "";
	const report: GoalResumeReport = {
		schemaVersion: 1,
		command: "goal resume",
		goalId: options.goalId,
		statePath,
		saved: false,
		wouldWrite: blocked ? [] : [statePath],
		written: [],
		blocked,
		reason: blocked
			? `goal resume paused by active blocker: ${before.activeBlocker?.requiredAction}`
			: "goal continuation prepared; rerun with --save to update project-local state",
		resumePrompt,
		beforeStatus: before.status,
		afterStatus: state.status,
		activeBlocker: state.activeBlocker,
		state,
	};
	if (blocked || options.save !== true) return report;
	await writeGoalState(projectRoot, statePath, state);
	return {
		...report,
		saved: true,
		wouldWrite: [],
		written: [statePath],
		reason: "goal continuation saved to project-local state",
	};
}

/** Request completion for a saved goal; writes state only with `save`. */
export async function completeSavedGoal(
	options: GoalCompleteOptions,
): Promise<GoalCompleteReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const statePath = goalStatePath(options.goalId);
	const before = await readGoalState(projectRoot, options.goalId);
	const evidence = completionEvidenceFromState(before, {
		completedRequirements: options.completedRequirements ?? [],
		verification: options.verification ?? [],
		completionAuditComplete: options.completionAuditComplete,
		...(options.intendedChangedFiles === undefined
			? {}
			: { intendedChangedFiles: options.intendedChangedFiles }),
		...(options.observedChangedFiles === undefined
			? {}
			: { observedChangedFiles: options.observedChangedFiles }),
	});
	const transition = requestGoalCompletion(before, evidence);
	const completed = transition.action === "complete";
	const report: GoalCompleteReport = {
		schemaVersion: 1,
		command: "goal complete",
		goalId: options.goalId,
		statePath,
		saved: false,
		wouldWrite: [statePath],
		written: [],
		completed,
		blocked: transition.blocker !== null,
		reason: completed
			? "goal completion verified"
			: transition.reasons.join("; "),
		evidence,
		state: transition.state,
	};
	if (options.save !== true) return report;
	await writeGoalState(projectRoot, statePath, transition.state);
	return {
		...report,
		saved: true,
		wouldWrite: [],
		written: [statePath],
		reason: completed
			? "goal completion saved after verification gate passed"
			: "goal completion gate result saved without marking complete",
	};
}

/** Persist a validated project-local goal state and return its relative path. */
export async function writeSavedGoalState(
	projectRoot: string,
	goalId: string,
	state: GoalLoopState,
): Promise<string> {
	const statePath = goalStatePath(goalId);
	await writeGoalState(path.resolve(projectRoot), statePath, state);
	return statePath;
}

/** Read a saved project-local goal state by id. */
export async function readGoalState(
	projectRoot: string,
	goalId: string,
): Promise<GoalLoopState> {
	try {
		return JSON.parse(
			await readFile(
				projectLocalPath(projectRoot, goalStatePath(goalId)),
				"utf8",
			),
		) as GoalLoopState;
	} catch (error) {
		if (error instanceof OlympiError) throw error;
		if (error instanceof SyntaxError) {
			throw new OlympiError(`Malformed saved goal state: ${goalId}`, 2, {
				input: goalId,
				expected: "valid JSON at .pi/olympi/goals/<goal-id>.json",
				written: [],
			});
		}
		throw new OlympiError(`Unknown goal id: ${goalId}`, 2, {
			input: goalId,
			expected: "an existing .pi/olympi/goals/<goal-id>.json file",
			written: [],
		});
	}
}

function goalStatePath(goalId: string): string {
	assertGoalId(goalId);
	return path.posix.join(".pi", "olympi", "goals", `${goalId}.json`);
}

function assertGoalId(goalId: string): void {
	if (
		goalId.length === 0 ||
		goalId === "." ||
		goalId === ".." ||
		goalId.includes("/") ||
		goalId.includes("\\") ||
		goalId.includes("..") ||
		!GOAL_ID_PATTERN.test(goalId)
	) {
		throw new OlympiError(`invalid goal id: ${goalId}`, 2, {
			input: goalId,
			expected: "goal id matching goal-[0-9a-f]+ without path separators",
			written: [],
		});
	}
}

async function writeGoalState(
	projectRoot: string,
	statePath: string,
	state: GoalLoopState,
): Promise<void> {
	const absolutePath = projectLocalPath(projectRoot, statePath);
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function goalCodeIntelligenceSummary(
	projectRoot: string,
	paths: string[],
): Promise<GoalCodeIntelligenceSummary> {
	const repoMap = await loadOrBuildRepoMap(projectRoot);
	return summarizeRepoMap(repoMap, codeContextForPaths(repoMap, paths));
}

async function loadOrBuildRepoMap(
	projectRoot: string,
): Promise<CodeIntelligenceRepoMap> {
	return (await readRepoMap(projectRoot)) ?? (await buildRepoMap(projectRoot));
}

function summarizeRepoMap(
	repoMap: CodeIntelligenceRepoMap,
	hints: string[],
): GoalCodeIntelligenceSummary {
	return {
		statePath: repoMap.statePath,
		parser: repoMap.engine.parser,
		lsp: repoMap.engine.lsp,
		contextHints: hints.slice(0, 8),
	};
}

function extractPathHints(text: string): string[] {
	const hints = text
		.split(PATH_HINT_SPLIT_PATTERN)
		.map((token) => token.replace(PATH_HINT_BOUNDARY_PATTERN, ""))
		.filter((token) => token.includes("/") || token.includes("."));
	return hints.length === 0 ? [text] : hints;
}

function projectLocalPath(projectRoot: string, relativePath: string): string {
	const root = path.resolve(projectRoot);
	const absolutePath = path.resolve(root, relativePath);
	const relative = path.relative(root, absolutePath);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new OlympiError(
			`goal state path escapes project root: ${relativePath}`,
			3,
		);
	}
	return absolutePath;
}
