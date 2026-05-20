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
const GIT_EXECUTABLE_PATTERN = /^git\b/;
const SEARCH_COMMAND_PATTERN = /\b(rg|grep|find)\b/;
const SEARCH_EXECUTABLE_PATTERN = /^(rg|grep|find)\b/;
const TEST_COMMAND_PATTERN =
	/\b(test|vitest|jest|bun\s+test|npm\s+test|pnpm\s+test)\b/;
const PACKAGE_MANAGER_COMMAND_PATTERN =
	/\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/;
const READ_COMMAND_PATTERN = /\b(cat|sed|awk|less|tail|head)\b/;
const READ_EXECUTABLE_PATTERN = /^(cat|less)\b/;

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
				? "RTK executable was not found on PATH; governed command execution blocks instead of using direct shell fallback."
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
			? `Route ${category} command execution through RTK automatically.`
			: `RTK ${category} routing blocks until rtk is on PATH.`,
	}));
}

export function recommendationForKind(
	kind: string,
	available: boolean,
): string {
	const category = categoryForKind(kind);
	return available
		? `RTK-backed ${category} routing is required for governed command execution.`
		: `RTK-backed ${category} routing is unavailable because rtk is not on PATH; governed execution must block rather than run directly.`;
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
				? "RTK is available on PATH; governed execution must use the RTK route."
				: (status.degradedReason ??
					"RTK unavailable; command execution blocks."),
			"Unsupported commands are proxied through RTK; direct shell workaround paths are not fallback behavior.",
		],
	};
}

function categoryForKind(kind: string): RtkCommandCategory {
	switch (kind) {
		case "git":
			return "git-diff-status-log";
		case "test":
			return "test-output";
		case "search":
			return "grep-find-rg";
		case "package-manager":
			return "package-manager-logs";
		default:
			return "shell-output";
	}
}

function categoryForCommand(command: string): RtkCommandCategory {
	const normalized = command.trim();
	switch (true) {
		case GIT_COMMAND_PATTERN.test(normalized):
			return "git-diff-status-log";
		case SEARCH_COMMAND_PATTERN.test(normalized):
			return "grep-find-rg";
		case TEST_COMMAND_PATTERN.test(normalized):
			return "test-output";
		case PACKAGE_MANAGER_COMMAND_PATTERN.test(normalized):
			return "package-manager-logs";
		case READ_COMMAND_PATTERN.test(normalized):
			return "read";
		default:
			return "shell-output";
	}
}

function recommendedForm(
	category: RtkCommandCategory,
	inputCommand: string,
): string {
	switch (category) {
		case "git-diff-status-log":
			return inputCommand.replace(GIT_EXECUTABLE_PATTERN, "rtk git");
		case "grep-find-rg":
			return inputCommand.replace(SEARCH_EXECUTABLE_PATTERN, (match) =>
				match === "find" ? "rtk find" : "rtk grep",
			);
		case "test-output":
			return `rtk test ${inputCommand}`;
		case "package-manager-logs":
			return `rtk proxy -- ${inputCommand}`;
		case "read":
			return inputCommand.replace(READ_EXECUTABLE_PATTERN, "rtk read");
		default:
			return `rtk proxy -- ${inputCommand}`;
	}
}

function fallbackForm(
	category: RtkCommandCategory,
	inputCommand: string,
): string {
	return `no direct shell fallback; required route is ${recommendedForm(category, inputCommand)}`;
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
