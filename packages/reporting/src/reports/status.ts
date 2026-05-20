import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	type OlympiExtensionRuntime,
	olympiExtensionRuntime,
} from "extensions";
import type { OlympiProjectStatus } from "lifecycle";
import {
	codeIntelligenceStatus,
	formatProjectStatus,
	olympiDirectory,
	readFeedbackReport,
	readProjectStatus,
} from "lifecycle";
import type { HookPolicyStatus } from "safety";
import {
	hookPolicyStatus,
	loadQuotaStatus,
	type QuotaStatusReport,
} from "safety";
import { detectRtk, type RtkStatusReport } from "../compaction/index.js";
import { deterministicDigest, sortStrings } from "./schema.js";

const JSON_EXTENSION_PATTERN = /\.json$/;

export interface DriftSummary {
	changedFiles: string[];
	deletedFiles: string[];
	settingsChangedPackages: string[];
	lockMismatchedPackages: string[];
}

export interface OlympiStatusReport extends OlympiProjectStatus {
	runtimeModel: OlympiExtensionRuntime;
	rtk: RtkStatusReport;
	quota: QuotaStatusReport;
	safety: {
		hooks: HookPolicyStatus;
		policyDecisionEvents: number;
		failClosed: boolean;
	};
	codeIntelligence: Awaited<ReturnType<typeof codeIntelligenceStatus>>;
	feedback: {
		items: number;
		openConcreteBlockers: number;
		statePath: string;
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

export interface OlympiHandoffReport {
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
	codeIntelligence: { present: boolean; parser: string; lsp: string };
	feedbackStatus: string;
	goals: GoalHandoffSummary[];
	warnings: string[];
	markdown: string;
	deterministicDigest: string;
}

export interface GoalHandoffSummary {
	goalId: string;
	objective: string;
	status: string;
	steps: number;
	executions: number;
	teamPlans: number;
	activeBlocker: string | null;
}

export async function buildStatusReport(
	projectRoot: string = process.cwd(),
): Promise<OlympiStatusReport> {
	const base = await readProjectStatus(projectRoot);
	const rtk = detectRtk();
	const quota = await loadQuotaStatus(projectRoot);
	const safety = {
		hooks: hookPolicyStatus(),
		policyDecisionEvents: await countPolicyDecisionEvents(projectRoot),
		failClosed: true,
	};
	const codeIntelligence = await codeIntelligenceStatus(projectRoot);
	const feedbackReport = await readFeedbackReport(projectRoot);
	const feedback = {
		items: feedbackReport.items.length,
		openConcreteBlockers: feedbackReport.openConcreteBlockers.length,
		statePath: feedbackReport.statePath,
	};
	const runtimeModel = olympiExtensionRuntime();
	const driftSummary = buildDriftSummary(base);
	const withoutDigest = {
		...base,
		runtimeModel,
		rtk,
		quota,
		safety,
		codeIntelligence,
		feedback,
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
): Promise<OlympiHandoffReport> {
	const status = await buildStatusReport(projectRoot);
	const goals = await readGoalHandoffSummaries(projectRoot);
	const actionItems = buildActionItems(status);
	const summary =
		status.warnings.length === 0
			? "Olympi project state is clean; continue with project-local, manifest-owned operations."
			: "Olympi project state has drift or degraded reporting context; review action items before trust-sensitive work.";
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
		codeIntelligence: {
			present: status.codeIntelligence.present,
			parser: status.codeIntelligence.engine.parser,
			lsp: status.codeIntelligence.engine.lsp,
		},
		feedbackStatus: `${status.feedback.items} items; ${status.feedback.openConcreteBlockers} concrete blockers`,
		goals,
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

export function formatStatusReport(report: OlympiStatusReport): string {
	const lines = [
		formatProjectStatus(report).trimEnd(),
		"Runtime model: Pi invokes Olympi as an extension; default install is project-local; --global is explicit global Pi registration; package-manager global CLI is separate",
		`Install model: project=${report.runtimeModel.projectInstall}; global Pi=${report.runtimeModel.globalPiInstall}; global binary=${report.runtimeModel.globalBinaryInstall}`,
		`RTK: ${report.rtk.status}${report.rtk.path === null ? "" : ` (${report.rtk.path})`}`,
		`Quota profile: ${report.quota.profile}`,
		`Safety policy: ${report.safety.failClosed ? "fail-closed" : "unknown"}`,
		`Policy decision events: ${report.safety.policyDecisionEvents}`,
		`Code intelligence: ${report.codeIntelligence.present ? "present" : "absent"}; parser=${report.codeIntelligence.engine.parser}; lsp=${report.codeIntelligence.engine.lsp}`,
		`Feedback: ${report.feedback.items} items; blockers=${report.feedback.openConcreteBlockers}`,
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

export function formatHandoffMarkdown(report: OlympiHandoffReport): string {
	const lines = ["# Olympi Handoff", "", report.summary, "", "## Action items"];
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
	lines.push("", "## Code intelligence");
	lines.push(
		`- Repo map: ${report.codeIntelligence.present ? "present" : "absent"}; parser=${report.codeIntelligence.parser}; LSP=${report.codeIntelligence.lsp}`,
	);
	lines.push("", "## Feedback");
	lines.push(`- ${report.feedbackStatus}`);
	lines.push("", "## Goal state");
	if (report.goals.length === 0) {
		lines.push("- none");
	} else {
		for (const goal of report.goals) {
			lines.push(
				`- ${goal.goalId}: ${goal.status}; steps=${goal.steps}; executions=${goal.executions}; teamPlans=${goal.teamPlans}; blocker=${goal.activeBlocker ?? "none"}`,
			);
		}
	}
	return `${lines.join("\n")}\n`;
}

async function readGoalHandoffSummaries(
	projectRoot: string,
): Promise<GoalHandoffSummary[]> {
	const goalsDirectory = path.join(olympiDirectory(projectRoot), "goals");
	try {
		const files = (await readdir(goalsDirectory))
			.filter((file) => file.endsWith(".json"))
			.sort();
		const summaries: GoalHandoffSummary[] = [];
		for (const file of files) {
			const parsed = JSON.parse(
				await readFile(path.join(goalsDirectory, file), "utf8"),
			) as Record<string, unknown>;
			const objective = asRecord(parsed["objective"]);
			const execution = asRecord(parsed["execution"]);
			const orchestration = asRecord(parsed["orchestration"]);
			const activeBlocker = asRecord(parsed["activeBlocker"]);
			summaries.push({
				goalId: String(
					objective["id"] ?? file.replace(JSON_EXTENSION_PATTERN, ""),
				),
				objective: String(objective["objective"] ?? "unknown objective"),
				status: String(parsed["status"] ?? "unknown"),
				steps: Array.isArray(parsed["steps"]) ? parsed["steps"].length : 0,
				executions: Array.isArray(execution["records"])
					? execution["records"].length
					: 0,
				teamPlans: Array.isArray(orchestration["teamPlans"])
					? orchestration["teamPlans"].length
					: 0,
				activeBlocker:
					activeBlocker["detail"] === undefined
						? null
						: String(activeBlocker["detail"]),
			});
		}
		return summaries;
	} catch (error) {
		if (isNotFound(error)) return [];
		throw error;
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function buildDriftSummary(status: OlympiProjectStatus): DriftSummary {
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

function buildActionItems(status: OlympiStatusReport): string[] {
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
			"Configure .pi/olympi/quota/profile.json if local quota labeling is needed.",
		);
	}
	if (items.length === 0)
		items.push("No immediate Olympi reporting action required.");
	return items.sort((left, right) => left.localeCompare(right));
}

function reportPaths(): OlympiStatusReport["reportPaths"] {
	return {
		status: ".pi/olympi/reports/status.json",
		handoff: ".pi/olympi/handoff/current.md",
		acceptance: ".pi/olympi/reports/acceptance.json",
		compaction: ".pi/olympi/reports/compaction/*.json",
		quota: ".pi/olympi/quota/profile.json",
	};
}

async function countPolicyDecisionEvents(projectRoot: string): Promise<number> {
	try {
		const text = await readFile(
			path.join(olympiDirectory(projectRoot), "policy", "decisions.jsonl"),
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
