import { readFile } from "node:fs/promises";
import path from "node:path";
import { getOlympiCatalog, validateOlympiCatalog } from "reporting";
import { loadQuotaStatus } from "safety";
import { detectRtk } from "../compaction/index.js";
import {
	reviewAgentInstructions,
	reviewDocumentationQuality,
} from "./operational.js";
import { deterministicDigest } from "./schema.js";

export interface AcceptanceCheck {
	name: string;
	ok: boolean;
	detail: string;
}

export interface AcceptanceReport {
	schemaVersion: 1;
	command: "report acceptance";
	checks: AcceptanceCheck[];
	ok: boolean;
	rtkStatus: ReturnType<typeof detectRtk>["status"];
	warnings: string[];
	deterministicDigest: string;
}

export async function buildAcceptanceReport(
	projectRoot: string = process.cwd(),
): Promise<AcceptanceReport> {
	const catalog = getOlympiCatalog();
	const catalogErrors = validateOlympiCatalog(catalog);
	const rtk = detectRtk();
	const quota = await loadQuotaStatus(projectRoot);
	const agentInstructions = await readOptional(
		path.join(projectRoot, "AGENTS.md"),
	);
	const verificationDocs = await readOptional(
		path.join(projectRoot, "docs", "verification.md"),
	);
	const instructionReview =
		agentInstructions === null
			? null
			: reviewAgentInstructions(agentInstructions);
	const docsReview =
		verificationDocs === null
			? null
			: reviewDocumentationQuality(verificationDocs);
	const checks: AcceptanceCheck[] = [
		{
			name: "catalog validates implemented commands",
			ok: catalogErrors.length === 0,
			detail: catalogErrors.length === 0 ? "valid" : catalogErrors.join("; "),
		},
		{
			name: "RTK reporting status is explicit",
			ok: rtk.status === "available" || rtk.degradedReason !== null,
			detail: rtk.status,
		},
		{
			name: "unknown quota remains unknown",
			ok: quota.profile !== "unknown" || quota.limits === "unknown",
			detail: `profile=${quota.profile}; limits=${quota.limits}`,
		},
		{
			name: "agent instructions have no conflicting guardrails",
			ok: instructionReview?.valid ?? true,
			detail:
				instructionReview === null
					? "AGENTS.md not present in this project root"
					: instructionReview.valid
						? "valid"
						: instructionReview.findings.join("; "),
		},
		{
			name: "documentation quality criteria pass when docs are present",
			ok: docsReview?.valid ?? true,
			detail:
				docsReview === null
					? "docs/verification.md not present in this project root"
					: docsReview.valid
						? "valid"
						: docsReview.findings.join("; "),
		},
	];
	const warnings = [
		...(rtk.degradedReason === null ? [] : [rtk.degradedReason]),
		...quota.warnings,
	];
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "report acceptance" as const,
		checks,
		ok: checks.every((check) => check.ok),
		rtkStatus: rtk.status,
		warnings,
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}

async function readOptional(filePath: string): Promise<string | null> {
	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		if (isNotFound(error)) return null;
		throw error;
	}
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}

export function formatAcceptanceReport(report: AcceptanceReport): string {
	const lines = [`Olympi acceptance report: ${report.ok ? "ok" : "failed"}`];
	for (const check of report.checks) {
		lines.push(`${check.ok ? "ok" : "fail"}: ${check.name} — ${check.detail}`);
	}
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
