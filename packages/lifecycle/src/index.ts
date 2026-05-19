export { evaluateLocalPackage } from "./evaluation.js";
export type {
	GoalBlocker,
	GoalBlockerKind,
	GoalCompletionEvidence,
	GoalContinuationState,
	GoalLedgerEntry,
	GoalLoopCreateOptions,
	GoalLoopState,
	GoalLoopStatus,
	GoalObjective,
	GoalRetryPolicy,
	GoalStep,
	GoalStepStatus,
	GoalTransition,
	GoalVerificationGate,
	GoalVerificationRecord,
	GoalWorkerResult,
} from "./goal-loop.js";
export {
	applyWorkerResult,
	createGoalLoopState,
	detectGoalBlocker,
	emptyCompletionEvidence,
	planGoalStep,
	recoverGoalContinuation,
	requestGoalCompletion,
	verifyGoalCompletion,
} from "./goal-loop.js";
export {
	directoryExists,
	fileExists,
	hashFile,
	hashPackageTree,
	listPackageFiles,
	toPosix,
} from "./hashing.js";
export { inspectLocalPackage } from "./inspection.js";
export type {
	ExecutableLoadReport,
	InstallReport,
	UninstallReport,
} from "./install-flow.js";
export {
	applyManifestUninstall,
	applyPassiveInstall,
	loadExecutablePackage,
	planExecutableInstall,
	planManifestUninstall,
	planPassiveInstall,
	stageExecutableInstall,
} from "./install-flow.js";
export type { LockPackageRecord, OlympiLock } from "./lock.js";
export { hasLockDigestMismatch, readLock, writeLock } from "./lock.js";
export type {
	AuditEvent,
	ManifestFileRecord,
	ManifestPackageRecord,
	OlympiManifest,
} from "./manifest.js";
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
export type {
	OlympiProfile,
	ProfileSetReport,
	ProfileStatusReport,
} from "./profile.js";
export { readProfileStatus, setProjectProfile } from "./profile.js";
export type {
	OlympiProjectStatus,
	ProjectPackageStatus,
} from "./project-status.js";
export { formatProjectStatus, readProjectStatus } from "./project-status.js";
export type { PiPackageSettingsEntry, PiSettingsFile } from "./settings.js";
export {
	readPiSettings,
	removePackageEntry,
	upsertPackageEntry,
	writePiSettings,
} from "./settings.js";
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
export { OlympiError } from "./types.js";
