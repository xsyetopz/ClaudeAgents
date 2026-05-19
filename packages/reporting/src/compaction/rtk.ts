import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type {
	RtkCommandCategory,
	RtkCommandRecommendation,
	RtkStatusReport,
} from "./types.js";

const RTK_BINARY_NAMES = ["rtk", "rtk-cli"];

const CATEGORIES: RtkCommandCategory[] = [
	"shell-output",
	"read",
	"grep-find-rg",
	"git-diff-status-log",
	"test-output",
	"package-manager-logs",
];

const GIT_COMMAND_PATTERN = /^git\s+(diff|status|log|show)\b/;
const SEARCH_COMMAND_PATTERN = /\b(rg|grep|find)\b/;
const TEST_COMMAND_PATTERN =
	/\b(test|vitest|jest|bun\s+test|npm\s+test|pnpm\s+test)\b/;
const PACKAGE_MANAGER_COMMAND_PATTERN =
	/\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/;
const READ_COMMAND_PATTERN = /\b(cat|sed|awk|less|tail|head)\b/;

export interface RtkCommandPlanReport {
	schemaVersion: 1;
	command: "rtk plan";
	inputCommand: string;
	category: RtkCommandCategory;
	rtkStatus: RtkStatusReport["status"];
	rtkPath: string | null;
	preferred: boolean;
	recommendedForm: string;
	fallbackForm: string;
	reasons: string[];
}

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

export function planRtkCommand(
	inputCommand: string,
	env: NodeJS.ProcessEnv = process.env,
): RtkCommandPlanReport {
	const status = detectRtk(env);
	const category = categoryForCommand(inputCommand);
	return {
		schemaVersion: 1,
		command: "rtk plan",
		inputCommand,
		category,
		rtkStatus: status.status,
		rtkPath: status.path,
		preferred: status.status === "available",
		recommendedForm: recommendedForm(category, inputCommand),
		fallbackForm: fallbackForm(category, inputCommand),
		reasons: [
			status.status === "available"
				? "RTK is available on PATH; prefer RTK-shaped bounded output before fallback compaction."
				: (status.degradedReason ?? "RTK unavailable; use fallback form."),
			"Command plan is advisory only; Olympus does not execute RTK or the input command.",
		],
	};
}

function categoryForKind(kind: string): RtkCommandCategory {
	if (kind === "git") return "git-diff-status-log";
	if (kind === "test") return "test-output";
	if (kind === "search") return "grep-find-rg";
	if (kind === "package-manager") return "package-manager-logs";
	return "shell-output";
}

function categoryForCommand(command: string): RtkCommandCategory {
	const normalized = command.trim();
	if (GIT_COMMAND_PATTERN.test(normalized)) return "git-diff-status-log";
	if (SEARCH_COMMAND_PATTERN.test(normalized)) return "grep-find-rg";
	if (TEST_COMMAND_PATTERN.test(normalized)) return "test-output";
	if (PACKAGE_MANAGER_COMMAND_PATTERN.test(normalized))
		return "package-manager-logs";
	if (READ_COMMAND_PATTERN.test(normalized)) return "read";
	return "shell-output";
}

function recommendedForm(
	category: RtkCommandCategory,
	inputCommand: string,
): string {
	return `rtk capture --category ${category} -- ${inputCommand}`;
}

function fallbackForm(
	category: RtkCommandCategory,
	inputCommand: string,
): string {
	return `${inputCommand} 2>&1 | olympus compact --kind ${kindForCategory(category)}`;
}

function kindForCategory(category: RtkCommandCategory): string {
	if (category === "git-diff-status-log") return "git";
	if (category === "grep-find-rg") return "search";
	if (category === "test-output") return "test";
	if (category === "package-manager-logs") return "package-manager";
	return "generic";
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
