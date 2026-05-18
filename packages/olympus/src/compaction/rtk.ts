import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type {
	RtkCommandCategory,
	RtkCommandRecommendation,
	RtkStatusReport,
} from "./types";

const RTK_BINARY_NAMES = ["rtk", "rtk-cli"];

const CATEGORIES: RtkCommandCategory[] = [
	"shell-output",
	"read",
	"grep-find-rg",
	"git-diff-status-log",
	"test-output",
	"package-manager-logs",
];

export function detectRtk(
	env: NodeJS.ProcessEnv = process.env,
): RtkStatusReport {
	const rtkPath = findRtkOnPath(env["PATH"] ?? "");
	return {
		schemaVersion: 1,
		command: "rtk status",
		status: rtkPath === null ? "unavailable" : "available",
		path: rtkPath,
		degradedReason:
			rtkPath === null
				? "RTK executable was not found on PATH; Olympus will use explicit in-house fallback compactors."
				: null,
		recommendations: buildRtkRecommendations(rtkPath !== null),
	};
}

export function buildRtkRecommendations(
	available: boolean,
): RtkCommandRecommendation[] {
	return CATEGORIES.map((category) => ({
		category,
		supported: true,
		preferredWhenAvailable: true,
		recommendation: available
			? `Prefer an RTK-backed ${category} path before in-house fallback compaction.`
			: `RTK-backed ${category} path is supported but unavailable until rtk is on PATH.`,
	}));
}

export function recommendationForKind(
	kind: string,
	available: boolean,
): string {
	const category = categoryForKind(kind);
	return available
		? `RTK-backed ${category} is preferred for this output; fallback compactors remain available for unsupported or insufficient RTK output.`
		: `RTK-backed ${category} is unavailable because rtk is not on PATH; using degraded fallback compaction.`;
}

function categoryForKind(kind: string): RtkCommandCategory {
	if (kind === "git") return "git-diff-status-log";
	if (kind === "test") return "test-output";
	if (kind === "search") return "grep-find-rg";
	if (kind === "package-manager") return "package-manager-logs";
	return "shell-output";
}

function findRtkOnPath(pathValue: string): string | null {
	for (const directory of pathValue.split(path.delimiter)) {
		if (directory.length === 0) continue;
		for (const binary of RTK_BINARY_NAMES) {
			const candidate = path.join(directory, binary);
			if (isExecutableFile(candidate)) return candidate;
		}
	}
	return null;
}

function isExecutableFile(candidate: string): boolean {
	try {
		const stat = statSync(candidate);
		return stat.isFile() && (stat.mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

export function pathContainsRtk(pathValue: string): boolean {
	return RTK_BINARY_NAMES.some((binary) =>
		pathValue
			.split(path.delimiter)
			.some((directory) => existsSync(path.join(directory, binary))),
	);
}
