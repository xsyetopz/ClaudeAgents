import { readFile } from "node:fs/promises";
import path from "node:path";
import { detectRtk, type RtkStatusReport } from "../compaction";
import { olympusDirectory } from "../manifest";
import { hookPolicyStatus } from "../policy/themis";
import type { HookPolicyStatus } from "../policy/types";
import type { OlympusProjectStatus } from "../project-status";
import { formatProjectStatus, readProjectStatus } from "../project-status";
import { loadQuotaStatus, type QuotaStatusReport } from "../quota/profile";
import { deterministicDigest, sortStrings } from "./schema";

export interface DriftSummary {
	changedFiles: string[];
	deletedFiles: string[];
	settingsChangedPackages: string[];
	lockMismatchedPackages: string[];
}

export interface OlympusStatusReport extends OlympusProjectStatus {
	rtk: RtkStatusReport;
	quota: QuotaStatusReport;
	safety: {
		hooks: HookPolicyStatus;
		policyDecisionEvents: number;
		failClosed: boolean;
	};
	reportPaths: {
		status: string;
		handoff: string;
		acceptance: string;
		compaction: string;
		quota: string;
	};
	driftSummary: DriftSummary;
	deterministicDigest: string;
}

export interface OlympusHandoffReport {
	schemaVersion: 1;
	command: "report handoff";
	projectRoot: string;
	summary: string;
	actionItems: string[];
	driftSummary: DriftSummary;
	rtkStatus: RtkStatusReport["status"];
	rtkDegradedReason: string | null;
	quotaProfile: QuotaStatusReport["profile"];
	safetyPolicyDecisionEvents: number;
	safetyFailClosed: boolean;
	warnings: string[];
	markdown: string;
	deterministicDigest: string;
}

export async function buildStatusReport(
	projectRoot: string = process.cwd(),
): Promise<OlympusStatusReport> {
	const base = await readProjectStatus(projectRoot);
	const rtk = detectRtk();
	const quota = await loadQuotaStatus(projectRoot);
	const safety = {
		hooks: hookPolicyStatus(),
		policyDecisionEvents: await countPolicyDecisionEvents(projectRoot),
		failClosed: true,
	};
	const driftSummary = buildDriftSummary(base);
	const withoutDigest = {
		...base,
		rtk,
		quota,
		safety,
		reportPaths: reportPaths(),
		driftSummary,
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}

export async function buildHandoffReport(
	projectRoot: string = process.cwd(),
): Promise<OlympusHandoffReport> {
	const status = await buildStatusReport(projectRoot);
	const actionItems = buildActionItems(status);
	const summary =
		status.warnings.length === 0
			? "Olympus project state is clean; continue with project-local, manifest-owned operations."
			: "Olympus project state has drift or degraded reporting context; review action items before trust-sensitive work.";
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "report handoff" as const,
		projectRoot: status.projectRoot,
		summary,
		actionItems,
		driftSummary: status.driftSummary,
		rtkStatus: status.rtk.status,
		rtkDegradedReason: status.rtk.degradedReason,
		quotaProfile: status.quota.profile,
		safetyPolicyDecisionEvents: status.safety.policyDecisionEvents,
		safetyFailClosed: status.safety.failClosed,
		warnings: status.warnings,
		markdown: "",
	};
	const markdown = formatHandoffMarkdown({
		...withoutDigest,
		markdown: "",
		deterministicDigest: "",
	});
	const withMarkdown = { ...withoutDigest, markdown };
	return {
		...withMarkdown,
		deterministicDigest: deterministicDigest(withMarkdown),
	};
}

export function formatStatusReport(report: OlympusStatusReport): string {
	const lines = [
		formatProjectStatus(report).trimEnd(),
		`RTK: ${report.rtk.status}${report.rtk.path === null ? "" : ` (${report.rtk.path})`}`,
		`Quota profile: ${report.quota.profile}`,
		`Safety policy: ${report.safety.failClosed ? "fail-closed" : "unknown"}`,
		`Policy decision events: ${report.safety.policyDecisionEvents}`,
		`Changed files: ${report.driftSummary.changedFiles.length}`,
		`Deleted files: ${report.driftSummary.deletedFiles.length}`,
	];
	if (report.rtk.degradedReason !== null) {
		lines.push(`degraded: ${report.rtk.degradedReason}`);
	}
	for (const warning of report.quota.warnings)
		lines.push(`quota warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

export function formatHandoffMarkdown(report: OlympusHandoffReport): string {
	const lines = [
		"# Olympus Handoff",
		"",
		report.summary,
		"",
		"## Action items",
	];
	for (const item of report.actionItems) lines.push(`- ${item}`);
	lines.push("", "## Drift summary");
	lines.push(
		`- Changed files: ${report.driftSummary.changedFiles.join(", ") || "none"}`,
	);
	lines.push(
		`- Deleted files: ${report.driftSummary.deletedFiles.join(", ") || "none"}`,
	);
	lines.push("", "## Efficiency status");
	lines.push(`- RTK: ${report.rtkStatus}`);
	if (report.rtkDegradedReason !== null)
		lines.push(`- RTK degraded: ${report.rtkDegradedReason}`);
	lines.push(`- Quota profile: ${report.quotaProfile}`);
	lines.push("", "## Safety status");
	lines.push(
		`- Policy: ${report.safetyFailClosed ? "fail-closed" : "unknown"}`,
	);
	lines.push(`- Policy decision events: ${report.safetyPolicyDecisionEvents}`);
	return `${lines.join("\n")}\n`;
}

function buildDriftSummary(status: OlympusProjectStatus): DriftSummary {
	return {
		changedFiles: sortStrings(
			status.packages.flatMap(
				(packageStatus) => packageStatus.fileHashMismatches,
			),
		),
		deletedFiles: sortStrings(
			status.packages.flatMap((packageStatus) => packageStatus.missingFiles),
		),
		settingsChangedPackages: sortStrings(
			status.packages
				.filter(
					(packageStatus) =>
						packageStatus.settingsEntryPresent &&
						!packageStatus.settingsEntryHashMatches,
				)
				.map((packageStatus) => packageStatus.packageId),
		),
		lockMismatchedPackages: sortStrings(
			status.packages
				.filter((packageStatus) => packageStatus.lockDigestMatches === false)
				.map((packageStatus) => packageStatus.packageId),
		),
	};
}

function buildActionItems(status: OlympusStatusReport): string[] {
	const items: string[] = [];
	if (status.driftSummary.changedFiles.length > 0) {
		items.push(
			"Review changed manifest-owned files before uninstall, trust, or handoff.",
		);
	}
	if (status.driftSummary.deletedFiles.length > 0) {
		items.push(
			"Restore or intentionally remove deleted manifest-owned files through manifest authority.",
		);
	}
	if (status.rtk.status === "unavailable") {
		items.push(
			"Install or expose RTK on PATH for preferred output-heavy workflow compaction.",
		);
	} else {
		items.push(
			"Use RTK-backed paths for output-heavy workflow compaction before local fallbacks.",
		);
	}
	if (status.quota.profile === "unknown") {
		items.push(
			"Configure .pi/olympus/quota/profile.json if local quota labeling is needed.",
		);
	}
	if (items.length === 0)
		items.push("No immediate Olympus reporting action required.");
	return items.sort((left, right) => left.localeCompare(right));
}

function reportPaths(): OlympusStatusReport["reportPaths"] {
	return {
		status: ".pi/olympus/reports/status.json",
		handoff: ".pi/olympus/handoff/current.md",
		acceptance: ".pi/olympus/reports/acceptance.json",
		compaction: ".pi/olympus/reports/compaction/*.json",
		quota: ".pi/olympus/quota/profile.json",
	};
}

async function countPolicyDecisionEvents(projectRoot: string): Promise<number> {
	try {
		const text = await readFile(
			path.join(olympusDirectory(projectRoot), "policy", "decisions.jsonl"),
			"utf8",
		);
		return text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0).length;
	} catch (error) {
		if (isNotFound(error)) return 0;
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
