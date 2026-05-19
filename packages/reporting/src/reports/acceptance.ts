import { getOlympiCatalog, validateOlympiCatalog } from "reporting";
import { loadQuotaStatus } from "safety";
import { detectRtk } from "../compaction/index.js";
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
	const serializedCatalog = JSON.stringify(catalog).toLowerCase();
	const checks: AcceptanceCheck[] = [
		{
			name: "catalog/spec has no stale active-OAL claims",
			ok: !(
				serializedCatalog.includes("openagentlayer") ||
				serializedCatalog.includes("active oal") ||
				serializedCatalog.includes("oal vnext")
			),
			detail: "Olympi catalog uses Olympi product authority only.",
		},
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

export function formatAcceptanceReport(report: AcceptanceReport): string {
	const lines = [`Olympi acceptance report: ${report.ok ? "ok" : "failed"}`];
	for (const check of report.checks) {
		lines.push(`${check.ok ? "ok" : "fail"}: ${check.name} — ${check.detail}`);
	}
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
