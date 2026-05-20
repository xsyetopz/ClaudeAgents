/** Project-local code intelligence contracts. */
export type {
	CodeIntelligenceEngineStatus,
	CodeIntelligenceFile,
	CodeIntelligenceRepoMap,
} from "./code-intelligence.js";
/** Build, refresh, read, and summarize repository code intelligence. */
export {
	buildRepoMap,
	codeContextForPaths,
	codeIntelligenceStatus,
	readRepoMap,
	refreshRepoMap,
} from "./code-intelligence.js";
/** Evaluate a local Pi package without executing package code. */
export { evaluateLocalPackage } from "./evaluation.js";
/** Repo-local feedback item contracts. */
export type {
	FeedbackClassification,
	FeedbackItem,
	FeedbackItemInput,
	FeedbackReport,
	FeedbackSource,
	FeedbackStatus,
} from "./feedback.js";
/** Record and list concrete product feedback. */
export {
	readFeedbackItems,
	readFeedbackReport,
	recordFeedbackItem,
} from "./feedback.js";
/** Goal-loop state, blocker, retry, continuation, and verification contracts. */
export type {
	GoalBlocker,
	GoalBlockerKind,
	GoalCompletionEvidence,
	GoalContinuationState,
	GoalExecutionRecord,
	GoalExecutionState,
	GoalLedgerEntry,
	GoalLoopCreateOptions,
	GoalLoopState,
	GoalLoopStatus,
	GoalObjective,
	GoalRetryPolicy,
	GoalStep,
	GoalStepStatus,
	GoalTeamAssignment,
	GoalTeamAssignmentInput,
	GoalTeamPlan,
	GoalTeamPlanOptions,
	GoalTeamPlanResult,
	GoalTransition,
	GoalVerificationGate,
	GoalVerificationRecord,
	GoalWorkerResult,
} from "./goal-loop.js";
/** Goal-loop planning, transition, recovery, and completion helpers. */
export {
	applyWorkerResult,
	completionEvidenceFromState,
	createGoalLoopState,
	detectGoalBlocker,
	emptyCompletionEvidence,
	pauseGoalWithBlocker,
	planGoalStep,
	planGoalTeam,
	recordGoalExecution,
	recoverGoalContinuation,
	requestGoalCompletion,
	verifyGoalCompletion,
} from "./goal-loop.js";
/** Goal workflow persistence report and option contracts. */
export type {
	GoalCompleteOptions,
	GoalCompleteReport,
	GoalPlanOptions,
	GoalPlanReport,
	GoalResumeOptions,
	GoalResumeReport,
	GoalStartOptions,
	GoalStartReport,
	GoalTeamOptions,
	GoalTeamReport,
} from "./goal-store.js";
/** Prepare, read, plan, or save project-local goal workflow state. */
export {
	completeSavedGoal,
	planSavedGoal,
	planSavedGoalTeam,
	readGoalState,
	resumeSavedGoal,
	startGoalWorkflow,
	writeSavedGoalState,
} from "./goal-store.js";
/** Filesystem hashing and path helpers used by manifest ownership checks. */
export {
	directoryExists,
	fileExists,
	hashFile,
	hashPackageTree,
	listPackageFiles,
	toPosix,
} from "./hashing.js";
/** Inspect a local Pi package without lifecycle execution. */
export { inspectLocalPackage } from "./inspection.js";
/** Install, uninstall, and executable-load report contracts. */
export type {
	ExecutableLoadReport,
	InstallReport,
	UninstallReport,
} from "./install-flow.js";
/** Plan or apply project-local package installs, unloads, and trusted executable loads. */
export {
	applyManifestUninstall,
	applyPassiveInstall,
	loadExecutablePackage,
	planExecutableInstall,
	planManifestUninstall,
	planPassiveInstall,
	stageExecutableInstall,
} from "./install-flow.js";
/** Project-local lockfile contracts. */
export type { LockPackageRecord, OlympiLock } from "./lock.js";
/** Read, write, and compare project-local lockfile records. */
export { hasLockDigestMismatch, readLock, writeLock } from "./lock.js";
/** Manifest and audit record contracts for project-local ownership. */
export type {
	AuditEvent,
	ManifestFileRecord,
	ManifestPackageRecord,
	OlympiManifest,
} from "./manifest.js";
/** Manifest paths, canonical hashing, audit append, and project-relative helpers. */
export {
	appendAuditEvent,
	auditPath,
	canonicalJson,
	hashJson,
	lockPath,
	manifestPath,
	olympiDirectory,
	readManifest,
	relativeToProject,
	writeManifest,
} from "./manifest.js";
/** Project-local memory store contracts. */
export type {
	MemoryEntry,
	MemoryInitReport,
	MemorySetEnabledReport,
	MemorySplit,
	MemorySplitId,
	MemoryStatusReport,
} from "./memory.js";
/** Initialize, read, and toggle the optional project-local memory store. */
export {
	DEFAULT_MEMORY_SPLITS,
	initializeMemoryStore,
	readEnabledMemoryText,
	readMemoryStatus,
	setMemoryEnabled,
} from "./memory.js";
/** Optional project-local profile contracts. */
export type {
	OlympiProfile,
	ProfileSetReport,
	ProfileStatusReport,
} from "./profile.js";
/** Read or set the optional project-local profile. */
export { readProfileStatus, setProjectProfile } from "./profile.js";
/** Project status and package drift contracts. */
export type {
	OlympiProjectStatus,
	ProjectPackageStatus,
} from "./project-status.js";
/** Read and format project-local Olympi status. */
export { formatProjectStatus, readProjectStatus } from "./project-status.js";
/** Project-local Pi settings contracts. */
export type { PiPackageSettingsEntry, PiSettingsFile } from "./settings.js";
/** Read, update, and write project-local Pi settings package entries. */
export {
	readPiSettings,
	removePackageEntry,
	upsertPackageEntry,
	writePiSettings,
} from "./settings.js";
/** Shared lifecycle report and resource contracts. */
export type {
	EvaluationReport,
	ExecutableReport,
	ExitCode,
	InspectionReport,
	PackageIdentity,
	ResourceKind,
	ResourceReport,
	RiskLabel,
	ScriptReport,
	SupportFile,
} from "./types.js";
/** Structured error carrying an Olympi exit code. */
export { OlympiError } from "./types.js";
