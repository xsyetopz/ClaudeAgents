export { main } from "./cli.js";
export type { VerifyCheck, VerifyReport } from "./commands/verify.js";
export { buildVerifyReport, formatVerifyReport } from "./commands/verify.js";
export type {
	InteractiveSession,
	InteractiveStatus,
} from "./interactive.ts";
export {
	formatInteractiveStatus,
	readInteractiveStatus,
	runInteractiveCli,
	runInteractiveSession,
} from "./interactive.ts";
export type { SetupStatusReport, ToolStatus } from "./setup-status.js";
export { formatSetupStatus, readSetupStatus } from "./setup-status.js";
