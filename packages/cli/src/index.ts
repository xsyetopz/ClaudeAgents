/** CLI process entrypoint for embedding or test invocation. */
export { createCliProgram, main } from "./cli.js";
/** Doctor report types produced by `olympi doctor`. */
export type { DoctorCheck, DoctorReport } from "./commands/doctor.js";
/** Doctor builders and terminal formatter. */
export { buildDoctorReport, formatDoctorReport } from "./commands/doctor.js";
/** Verification report types produced by `olympi dev verify`. */
export type { VerifyCheck, VerifyReport } from "./commands/verify.js";
/** Verification builders and terminal formatter. */
export { buildVerifyReport, formatVerifyReport } from "./commands/verify.js";
/** Interactive console session and startup status contracts. */
export type {
	InteractiveSession,
	InteractiveStatus,
} from "./interactive.ts";
/** Interactive console runners and status formatting helpers. */
export {
	formatInteractiveStatus,
	readInteractiveStatus,
	runInteractiveCli,
	runInteractiveSession,
} from "./interactive.ts";
/** Local setup readiness report types. */
export type { SetupStatusReport, ToolStatus } from "./setup-status.js";
/** Local setup readiness reader and terminal formatter. */
export { formatSetupStatus, readSetupStatus } from "./setup-status.js";
