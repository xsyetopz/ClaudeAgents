import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { olympiDirectory } from "lifecycle";
import { deterministicDigest, stableJson } from "reporting";
import type { PolicyDecision } from "../policy/types.js";

export interface HestiaAuditRecord {
	schemaVersion: 1;
	kind:
		| "policy-decision"
		| "provider-payload"
		| "sandbox-probe"
		| "broker-validation";
	auditId: string;
	ok: boolean;
	summary: string;
	reasons: string[];
	redactions: string[];
	timestamp: string;
}

export function auditRecordFromDecision(
	decision: PolicyDecision,
	timestamp = "1970-01-01T00:00:00.000Z",
): HestiaAuditRecord {
	return {
		schemaVersion: 1,
		kind:
			decision.eventType === "before_provider_request"
				? "provider-payload"
				: "policy-decision",
		auditId: decision.auditId,
		ok: !decision.blocked,
		summary: `${decision.eventType}:${decision.decision}:${decision.subject}`,
		reasons: decision.reasons,
		redactions: decision.redactions,
		timestamp,
	};
}

export async function appendHestiaAudit(
	projectRoot: string,
	record: HestiaAuditRecord,
): Promise<string> {
	const targetDirectory = path.join(olympiDirectory(projectRoot), "policy");
	await mkdir(targetDirectory, { recursive: true });
	const targetPath = path.join(targetDirectory, "decisions.jsonl");
	const sanitized = sanitizeAuditRecord(record);
	await writeFile(targetPath, `${stableJson(sanitized)}\n`, { flag: "a" });
	return targetPath;
}

export function sanitizeAuditRecord(
	record: HestiaAuditRecord,
): HestiaAuditRecord {
	return {
		...record,
		summary: record.summary.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]"),
		reasons: record.reasons.map((reason) =>
			reason.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]"),
		),
		redactions: record.redactions,
	};
}

export function auditDigest(record: HestiaAuditRecord): string {
	return deterministicDigest(sanitizeAuditRecord(record));
}
