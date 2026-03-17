import { join } from "node:path";

export const CWD = process.cwd();
export const AUDIT_LOG_PATH = join(CWD, ".claude", "audit-log.jsonl");
export const CHECKPOINTS_PATH = join(CWD, ".claude", "checkpoints.json");
