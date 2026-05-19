export type GoalLoopStatus = "active" | "paused" | "blocked" | "completed";

export type GoalStepStatus =
	| "pending"
	| "running"
	| "done"
	| "failed"
	| "blocked";

export type GoalBlockerKind =
	| "credentials"
	| "missing-files"
	| "unclear-authority"
	| "ambiguous-ownership"
	| "unavailable-command"
	| "failing-environment"
	| "impossible-constraints"
	| "safety-veto"
	| "repeated-failures";

export interface GoalObjective {
	id: string;
	objective: string;
	createdAt: string;
	acceptanceCriteria: string[];
	verificationCommands: string[];
	completionAuditRequirements: string[];
	stopConditions: string[];
}

export interface GoalStep {
	id: string;
	description: string;
	status: GoalStepStatus;
	attempts: number;
	maxAttempts: number;
	evidence: string[];
}

export interface GoalLedgerEntry {
	sequence: number;
	kind:
		| "planned"
		| "attempted"
		| "evidence"
		| "verification"
		| "blocked"
		| "continued"
		| "completed";
	detail: string;
	stepId?: string;
	createdAt: string;
}

export interface GoalBlocker {
	kind: GoalBlockerKind;
	detail: string;
	requiredAction: string;
	evidence: string[];
}

export interface GoalVerificationRecord {
	command: string;
	exitCode: number;
	output?: string;
}

export interface GoalCompletionEvidence {
	completedRequirements: string[];
	verification: GoalVerificationRecord[];
	completionAuditComplete: boolean;
	intendedChangedFiles?: string[];
	observedChangedFiles?: string[];
	unresolvedBlockers?: string[];
}

export interface GoalVerificationGate {
	allowed: boolean;
	reasons: string[];
	missingAcceptance: string[];
	missingVerificationCommands: string[];
	missingIntendedChangedFiles: string[];
	unexpectedChangedFiles: string[];
	unresolvedBlockers: string[];
	completionAuditComplete: boolean;
}

export interface GoalRetryPolicy {
	maxAttemptsPerStep: number;
	pauseOnBlocker: true;
	pauseOnRepeatedFailure: true;
}

export interface GoalContinuationState {
	lastCompactionSummary: string | null;
	recoveredPrompt: string | null;
	objectivePreserved: boolean;
	completionAuditPreserved: boolean;
}

export interface GoalLoopState {
	schemaVersion: 1;
	objective: GoalObjective;
	status: GoalLoopStatus;
	steps: GoalStep[];
	ledger: GoalLedgerEntry[];
	activeBlocker: GoalBlocker | null;
	verificationGate: GoalVerificationGate;
	retryPolicy: GoalRetryPolicy;
	continuation: GoalContinuationState;
}

export interface GoalLoopCreateOptions {
	id?: string;
	objective: string;
	createdAt?: string;
	acceptanceCriteria?: string[];
	verificationCommands?: string[];
	completionAuditRequirements?: string[];
	stopConditions?: string[];
	maxAttemptsPerStep?: number;
}

export interface GoalWorkerResult {
	stepId: string;
	summary: string;
	evidence?: string[];
	exitCode?: number;
	failed?: boolean;
}

export interface GoalTransition {
	state: GoalLoopState;
	action: "continue" | "pause" | "complete";
	reasons: string[];
	blocker: GoalBlocker | null;
}

const DEFAULT_COMPLETION_AUDIT_REQUIREMENTS = [
	"map every explicit objective requirement to evidence",
	"verify the current source state, not only intended changes",
	"record validation commands and results",
];

const DEFAULT_STOP_CONDITIONS = [
	"credentials are missing",
	"required files are missing",
	"authority to mutate is unclear",
	"required command or environment is unavailable",
	"constraints are impossible to satisfy",
	"bounded retries are exhausted",
];

const CREDENTIAL_BLOCKER_PATTERN = /credential|api key|token|secret|auth/;
const MISSING_FILE_BLOCKER_PATTERN =
	/enoent|no such file|missing file|not found/;
const UNCLEAR_AUTHORITY_BLOCKER_PATTERN =
	/permission denied|approval|authority|who owns|unclear/;
const AMBIGUOUS_OWNERSHIP_BLOCKER_PATTERN =
	/ambiguous ownership|ambiguous workspace|unexplained change|user-owned|ownership proof/;
const UNAVAILABLE_COMMAND_BLOCKER_PATTERN =
	/command not found|not installed|unavailable command/;
const FAILING_ENVIRONMENT_BLOCKER_PATTERN =
	/environment|sandbox|network unavailable|rate limit|quota/;
const IMPOSSIBLE_CONSTRAINT_BLOCKER_PATTERN =
	/impossible|cannot satisfy|contradiction|mutually exclusive/;

export function createGoalLoopState(
	options: GoalLoopCreateOptions,
): GoalLoopState {
	const objective: GoalObjective = {
		id: options.id ?? stableGoalId(options.objective),
		objective: options.objective,
		createdAt: options.createdAt ?? new Date().toISOString(),
		acceptanceCriteria: sortUnique(options.acceptanceCriteria ?? []),
		verificationCommands: sortUnique(options.verificationCommands ?? []),
		completionAuditRequirements: sortUnique(
			options.completionAuditRequirements ??
				DEFAULT_COMPLETION_AUDIT_REQUIREMENTS,
		),
		stopConditions: sortUnique(
			options.stopConditions ?? DEFAULT_STOP_CONDITIONS,
		),
	};
	return {
		schemaVersion: 1,
		objective,
		status: "active",
		steps: [],
		ledger: [ledgerEntry(0, "planned", objective.objective, undefined)],
		activeBlocker: null,
		verificationGate: verifyGoalCompletion(
			objective,
			emptyCompletionEvidence(),
		),
		retryPolicy: {
			maxAttemptsPerStep: options.maxAttemptsPerStep ?? 2,
			pauseOnBlocker: true,
			pauseOnRepeatedFailure: true,
		},
		continuation: {
			lastCompactionSummary: null,
			recoveredPrompt: null,
			objectivePreserved: true,
			completionAuditPreserved: true,
		},
	};
}

export function planGoalStep(
	state: GoalLoopState,
	description: string,
	options: { id?: string; maxAttempts?: number } = {},
): GoalLoopState {
	if (state.status === "blocked" && state.activeBlocker !== null) {
		return appendLedger(
			state,
			"blocked",
			`planning paused while blocker is active: ${state.activeBlocker.detail}`,
			undefined,
		);
	}
	const step: GoalStep = {
		id: options.id ?? `step-${state.steps.length + 1}`,
		description,
		status: "pending",
		attempts: 0,
		maxAttempts: options.maxAttempts ?? state.retryPolicy.maxAttemptsPerStep,
		evidence: [],
	};
	return appendLedger(
		{ ...state, steps: [...state.steps, step] },
		"planned",
		description,
		step.id,
	);
}

export function applyWorkerResult(
	state: GoalLoopState,
	result: GoalWorkerResult,
): GoalTransition {
	const step = state.steps.find((candidate) => candidate.id === result.stepId);
	if (step === undefined) {
		const blocker: GoalBlocker = {
			kind: "unclear-authority",
			detail: `worker result referenced unknown step ${result.stepId}`,
			requiredAction:
				"rebuild the plan ledger before retrying worker execution",
			evidence: [result.summary],
		};
		return pauseWithBlocker(state, blocker);
	}

	const blocker = detectGoalBlocker({
		text: result.summary,
		...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
		evidence: result.evidence ?? [],
	});
	if (blocker !== null) return pauseWithBlocker(state, blocker, step.id);

	const attempts = step.attempts + 1;
	const failed = result.failed === true || (result.exitCode ?? 0) !== 0;
	if (failed && attempts >= step.maxAttempts) {
		return pauseWithBlocker(
			updateStep(state, step.id, {
				attempts,
				status: "failed",
				evidence: sortUnique([...step.evidence, ...(result.evidence ?? [])]),
			}),
			{
				kind: "repeated-failures",
				detail: `step ${step.id} reached ${attempts} bounded attempts`,
				requiredAction:
					"pause for reviewer diagnosis or skill/hook refinement before retrying",
				evidence: [result.summary, ...(result.evidence ?? [])],
			},
			step.id,
		);
	}

	const updated = appendLedger(
		updateStep(state, step.id, {
			attempts,
			status: failed ? "failed" : "done",
			evidence: sortUnique([...step.evidence, ...(result.evidence ?? [])]),
		}),
		failed ? "attempted" : "evidence",
		result.summary,
		step.id,
	);
	return {
		state: updated,
		action: failed ? "continue" : "continue",
		reasons: failed
			? ["worker failed but bounded retry budget remains"]
			: ["worker result recorded with no blocker"],
		blocker: null,
	};
}

export function requestGoalCompletion(
	state: GoalLoopState,
	evidence: GoalCompletionEvidence,
): GoalTransition {
	const gate = verifyGoalCompletion(state.objective, evidence);
	const updated = appendLedger(
		{ ...state, verificationGate: gate },
		"verification",
		gate.allowed ? "completion verification passed" : gate.reasons.join("; "),
		undefined,
	);
	if (!gate.allowed) {
		return {
			state: { ...updated, status: "active" },
			action: "continue",
			reasons: gate.reasons,
			blocker: null,
		};
	}
	return {
		state: appendLedger(
			{ ...updated, status: "completed", activeBlocker: null },
			"completed",
			"objective completed after explicit verification gate",
			undefined,
		),
		action: "complete",
		reasons: ["completion verified against objective requirements"],
		blocker: null,
	};
}

export function recoverGoalContinuation(
	state: GoalLoopState,
	compactionSummary: string,
): GoalLoopState {
	const recoveredPrompt = [
		"Continue working toward the active Olympi goal.",
		`Objective: ${state.objective.objective}`,
		"Completion audit requirements:",
		...state.objective.completionAuditRequirements.map(
			(requirement) => `- ${requirement}`,
		),
		"Stop or pause instead of continuing if a concrete blocker is present.",
	].join("\n");
	return appendLedger(
		{
			...state,
			status: state.status === "completed" ? "completed" : "active",
			continuation: {
				lastCompactionSummary: compactionSummary,
				recoveredPrompt,
				objectivePreserved: recoveredPrompt.includes(state.objective.objective),
				completionAuditPreserved:
					state.objective.completionAuditRequirements.every((requirement) =>
						recoveredPrompt.includes(requirement),
					),
			},
		},
		"continued",
		"recovered durable objective and completion audit after compaction",
		undefined,
	);
}

export function verifyGoalCompletion(
	objective: GoalObjective,
	evidence: GoalCompletionEvidence,
): GoalVerificationGate {
	const completed = new Set(evidence.completedRequirements);
	const missingAcceptance = objective.acceptanceCriteria.filter(
		(requirement) => !completed.has(requirement),
	);
	const passingCommands = new Set(
		evidence.verification
			.filter((record) => record.exitCode === 0)
			.map((record) => record.command),
	);
	const missingVerificationCommands = objective.verificationCommands.filter(
		(command) => !passingCommands.has(command),
	);
	const intendedChangedFiles = sortUnique(evidence.intendedChangedFiles ?? []);
	const observedChangedFiles = sortUnique(evidence.observedChangedFiles ?? []);
	const missingIntendedChangedFiles =
		intendedChangedFiles.length === 0
			? []
			: intendedChangedFiles.filter(
					(filePath) => !observedChangedFiles.includes(filePath),
				);
	const unexpectedChangedFiles =
		observedChangedFiles.length === 0 || intendedChangedFiles.length === 0
			? []
			: observedChangedFiles.filter(
					(filePath) => !intendedChangedFiles.includes(filePath),
				);
	const unresolvedBlockers = sortUnique(evidence.unresolvedBlockers ?? []);
	const reasons = [
		...missingAcceptance.map(
			(requirement) => `missing acceptance evidence: ${requirement}`,
		),
		...missingVerificationCommands.map(
			(command) => `verification command has not passed: ${command}`,
		),
		...missingIntendedChangedFiles.map(
			(filePath) => `intended file is absent from observed diff: ${filePath}`,
		),
		...unexpectedChangedFiles.map(
			(filePath) => `unintended file is present in observed diff: ${filePath}`,
		),
		...unresolvedBlockers.map((blocker) => `unresolved blocker: ${blocker}`),
		...(evidence.completionAuditComplete
			? []
			: ["completion audit has not been explicitly completed"]),
	];
	return {
		allowed: reasons.length === 0,
		reasons: reasons.sort(),
		missingAcceptance,
		missingVerificationCommands,
		missingIntendedChangedFiles,
		unexpectedChangedFiles,
		unresolvedBlockers,
		completionAuditComplete: evidence.completionAuditComplete,
	};
}

export function detectGoalBlocker(options: {
	text: string;
	exitCode?: number;
	evidence?: string[];
}): GoalBlocker | null {
	const text = options.text.toLowerCase();
	const evidence = options.evidence ?? [];
	if (CREDENTIAL_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"credentials",
			options.text,
			"provide the missing credential or authorize a credential-free path",
			evidence,
		);
	}
	if (MISSING_FILE_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"missing-files",
			options.text,
			"provide the missing file or update the objective to exclude it",
			evidence,
		);
	}
	if (UNCLEAR_AUTHORITY_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"unclear-authority",
			options.text,
			"clarify ownership or grant explicit approval before continuing",
			evidence,
		);
	}
	if (AMBIGUOUS_OWNERSHIP_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"ambiguous-ownership",
			options.text,
			"prove manifest/hash/provenance ownership or get explicit user approval before touching the path",
			evidence,
		);
	}
	if (UNAVAILABLE_COMMAND_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"unavailable-command",
			options.text,
			"install the command or choose an available validation path",
			evidence,
		);
	}
	if (FAILING_ENVIRONMENT_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"failing-environment",
			options.text,
			"fix the environment or resume after the unavailable backend recovers",
			evidence,
		);
	}
	if (IMPOSSIBLE_CONSTRAINT_BLOCKER_PATTERN.test(text)) {
		return blocker(
			"impossible-constraints",
			options.text,
			"revise the objective or remove the contradictory constraint",
			evidence,
		);
	}
	if (options.exitCode !== undefined && options.exitCode !== 0) {
		return blocker(
			"failing-environment",
			options.text,
			"diagnose the failing command before retrying unrelated work",
			evidence,
		);
	}
	return null;
}

export function emptyCompletionEvidence(): GoalCompletionEvidence {
	return {
		completedRequirements: [],
		verification: [],
		completionAuditComplete: false,
	};
}

function pauseWithBlocker(
	state: GoalLoopState,
	blockerValue: GoalBlocker,
	stepId?: string,
): GoalTransition {
	const updated = appendLedger(
		{
			...updateStepIfPresent(state, stepId, { status: "blocked" }),
			status: "blocked",
			activeBlocker: blockerValue,
		},
		"blocked",
		`${blockerValue.kind}: ${blockerValue.requiredAction}`,
		stepId,
	);
	return {
		state: updated,
		action: "pause",
		reasons: [blockerValue.requiredAction],
		blocker: blockerValue,
	};
}

function updateStep(
	state: GoalLoopState,
	stepId: string,
	patch: Partial<GoalStep>,
): GoalLoopState {
	return {
		...state,
		steps: state.steps.map((step) =>
			step.id === stepId ? { ...step, ...patch } : step,
		),
	};
}

function updateStepIfPresent(
	state: GoalLoopState,
	stepId: string | undefined,
	patch: Partial<GoalStep>,
): GoalLoopState {
	return stepId === undefined ? state : updateStep(state, stepId, patch);
}

function appendLedger(
	state: GoalLoopState,
	kind: GoalLedgerEntry["kind"],
	detail: string,
	stepId: string | undefined,
): GoalLoopState {
	return {
		...state,
		ledger: [
			...state.ledger,
			ledgerEntry(state.ledger.length, kind, detail, stepId),
		],
	};
}

function ledgerEntry(
	sequence: number,
	kind: GoalLedgerEntry["kind"],
	detail: string,
	stepId: string | undefined,
): GoalLedgerEntry {
	return {
		sequence,
		kind,
		detail,
		...(stepId === undefined ? {} : { stepId }),
		createdAt: new Date().toISOString(),
	};
}

function blocker(
	kind: GoalBlockerKind,
	detail: string,
	requiredAction: string,
	evidence: string[],
): GoalBlocker {
	return { kind, detail, requiredAction, evidence };
}

function stableGoalId(objective: string): string {
	let hash = 0;
	for (const char of objective) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}
	return `goal-${hash.toString(16).padStart(8, "0")}`;
}

function sortUnique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}
