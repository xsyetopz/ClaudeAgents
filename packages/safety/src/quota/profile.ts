import { readFile } from "node:fs/promises";
import path from "node:path";
import { olympusDirectory } from "lifecycle";

export type QuotaProfileLabel = "plus" | "pro-5x" | "pro-20x" | "unknown";
export type QuotaUncertainty =
	| "user-configured"
	| "provider-observed"
	| "estimated"
	| "unknown";

export interface QuotaUsageEstimate {
	source: "codex-lb-compatible" | "local-estimate" | "unknown";
	sourceUrl: string;
	implementationDetail: string;
	endpoints: string[];
	localPath: string | null;
	lastObservedAt: string | null;
	inputTokens: number | null;
	outputTokens: number | null;
	costUsd: number | null;
	uncertainty: QuotaUncertainty;
}

export interface QuotaStatusReport {
	schemaVersion: 1;
	command: "quota status";
	profile: QuotaProfileLabel;
	profileSource: "user-config" | "unknown";
	limits: "unknown";
	providerObservedUsage: Record<string, unknown> | null;
	localUsageEstimate: QuotaUsageEstimate;
	uncertainty: QuotaUncertainty;
	expensiveWorkflowWarning: string;
	warnings: string[];
}

interface UserQuotaProfile {
	profile?: QuotaProfileLabel;
	providerObservedUsage?: Record<string, unknown>;
}

export async function loadQuotaStatus(
	projectRoot: string = process.cwd(),
): Promise<QuotaStatusReport> {
	const profilePath = path.join(
		olympusDirectory(projectRoot),
		"quota",
		"profile.json",
	);
	const userProfile = await readUserProfile(profilePath);
	const profile = userProfile?.profile ?? "unknown";
	return {
		schemaVersion: 1,
		command: "quota status",
		profile,
		profileSource: userProfile === null ? "unknown" : "user-config",
		limits: "unknown",
		providerObservedUsage: userProfile?.providerObservedUsage ?? null,
		localUsageEstimate: {
			source: "codex-lb-compatible",
			sourceUrl: "https://github.com/Soju06/codex-lb",
			implementationDetail:
				"Soju06/codex-lb documents ChatGPT account pooling with per-account token/cost usage, 28-day trends, API-key token/cost windows, a dashboard, and usage endpoints including /v1/usage and /api/codex/usage.",
			endpoints: ["/v1/usage", "/api/codex/usage"],
			localPath: ".pi/olympus/quota/usage-estimates.jsonl",
			lastObservedAt: null,
			inputTokens: null,
			outputTokens: null,
			costUsd: null,
			uncertainty: "estimated",
		},
		uncertainty: userProfile === null ? "unknown" : "user-configured",
		expensiveWorkflowWarning:
			"Output-heavy workflows can consume quota quickly; use RTK-backed compaction/status paths when available and treat all quota values as uncertain unless provider-observed.",
		warnings: [
			...(profile === "unknown"
				? [
						"Quota profile is unknown; Olympus will not fabricate provider limits.",
					]
				: []),
			"Opaque provider limits are intentionally reported as unknown unless supplied by a provider-observed source.",
		],
	};
}

async function readUserProfile(
	profilePath: string,
): Promise<UserQuotaProfile | null> {
	try {
		const parsed = JSON.parse(await readFile(profilePath, "utf8")) as unknown;
		if (typeof parsed !== "object" || parsed === null) return null;
		const record = parsed as UserQuotaProfile;
		if (!isProfile(record.profile)) return null;
		return record;
	} catch (error) {
		if (isNotFound(error)) return null;
		throw error;
	}
}

function isProfile(value: unknown): value is QuotaProfileLabel | undefined {
	return (
		value === undefined ||
		value === "plus" ||
		value === "pro-5x" ||
		value === "pro-20x" ||
		value === "unknown"
	);
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
