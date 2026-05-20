import type { CompactionKind } from "./types.js";

const CRITICAL_PATTERNS = [
	/\b(exit|status)\s*(code|status)?\s*[:=]\s*\d+/i,
	/\b(fail|failed|failure|failing|error|exception|assertionerror|traceback|panic)\b/i,
	/^\s*(FAIL|ERROR)\b|^\s*(✗|×)\s+/,
	/^diff --git\s+/,
	/^deleted file mode\s+/,
	/^D\s+\S+/,
	/^\s*deleted:\s+\S+/i,
	/^[-+]{3}\s+[ab]?\/?\S+/,
	/^\s*(modified|new file|renamed|deleted):\s+\S+/i,
	/\b(REDACTED|blocked-policy|blocked by policy|policy warning|approval decision|denied|approved)\b/i,
];

const GIT_DIFF_PATTERN = /^diff --git\s+/m;
const GIT_DELETED_PATTERN = /^deleted file mode\s+/m;
const TEST_STATUS_PATTERN = /^\s*(FAIL|ERROR|ok|pass|✓|✗)\b/m;
const TEST_WORD_PATTERN = /\btests?\b/i;
const SEARCH_MATCH_PATTERN = /^\S.*:\d+:/m;
const SEARCH_TOOL_PATTERN = /\b(rg|grep|find)\b/i;
const PACKAGE_MANAGER_PATTERN =
	/\b(npm|bun|yarn|pnpm|postinstall|lockfile|installing|ERR!)\b/i;
const STACK_TRACE_PATTERN =
	/\b(Traceback|Stack trace|Error:|Exception|at \S+ \()/i;
const GIT_DIFF_FILE_PATTERN = /^diff --git a\/(.+?) b\/(.+)$/;
const GIT_DELETED_FILE_PATTERN = /^(?:D|\s*deleted:)\s+(.+)$/i;
const FAILING_TEST_PATTERN = /\b(fail|failed|failure|error|assertionerror)\b/i;
const SYMBOL_FAILURE_PATTERN = /^[\s]*(✗|×)\s+/;
const PACKAGE_MANAGER_CRITICAL_PATTERN =
	/\b(npm|bun|yarn|pnpm|ERR!|error|failed|postinstall)\b/i;
const STACK_FRAME_PATTERN =
	/\b(Traceback|Error:|Exception|at \S+ \(|\.ts:\d+:\d+|\.js:\d+:\d+)/;

export interface FallbackSummary {
	kind: CompactionKind;
	criticalContext: string[];
	summary: string[];
	warnings: string[];
}

export function inferCompactionKind(text: string): CompactionKind {
	switch (true) {
		case GIT_DIFF_PATTERN.test(text) || GIT_DELETED_PATTERN.test(text):
			return "git";
		case TEST_STATUS_PATTERN.test(text) || TEST_WORD_PATTERN.test(text):
			return "test";
		case SEARCH_MATCH_PATTERN.test(text) || SEARCH_TOOL_PATTERN.test(text):
			return "search";
		case PACKAGE_MANAGER_PATTERN.test(text):
			return "package-manager";
		case STACK_TRACE_PATTERN.test(text):
			return "stack-trace";
		default:
			return "generic";
	}
}

export function fallbackCompact(
	kind: CompactionKind,
	text: string,
): FallbackSummary {
	switch (kind) {
		case "git":
			return summarizeGit(text);
		case "test":
			return summarizeTest(text);
		case "search":
			return summarizeSearch(text);
		case "package-manager":
			return summarizePackageManager(text);
		case "stack-trace":
			return summarizeStackTrace(text);
		default:
			return summarizeGeneric(text);
	}
}

function summarizeGit(text: string): FallbackSummary {
	const lines = text.split("\n");
	const files = new Set<string>();
	const deletions = new Set<string>();
	for (const line of lines) {
		const diff = line.match(GIT_DIFF_FILE_PATTERN);
		if (diff) files.add(diff[2] ?? diff[1] ?? line);
		const deleted = line.match(GIT_DELETED_FILE_PATTERN);
		if (deleted?.[1]) deletions.add(deleted[1].trim());
		if (line.startsWith("deleted file mode"))
			deletions.add("deleted file marker present");
	}
	return withCritical("git", text, [
		`changed files: ${files.size === 0 ? "none detected" : [...files].sort().join(", ")}`,
		`deleted files: ${deletions.size === 0 ? "none detected" : [...deletions].sort().join(", ")}`,
	]);
}

function summarizeTest(text: string): FallbackSummary {
	const failing = criticalLines(text).filter(
		(line) =>
			FAILING_TEST_PATTERN.test(line) || SYMBOL_FAILURE_PATTERN.test(line),
	);
	return withCritical("test", text, [
		`failing test lines: ${failing.length === 0 ? "none detected" : failing.length}`,
		...failing.slice(0, 12),
	]);
}

function summarizeSearch(text: string): FallbackSummary {
	const matches = text
		.split("\n")
		.filter((line) => SEARCH_MATCH_PATTERN.test(line))
		.slice(0, 20);
	return withCritical("search", text, [
		`search matches shown: ${matches.length}`,
		...matches,
	]);
}

function summarizePackageManager(text: string): FallbackSummary {
	const relevant = criticalLines(text).filter((line) =>
		PACKAGE_MANAGER_CRITICAL_PATTERN.test(line),
	);
	return withCritical("package-manager", text, [
		`package-manager critical lines: ${relevant.length}`,
		...relevant.slice(0, 16),
	]);
}

function summarizeStackTrace(text: string): FallbackSummary {
	const lines = text.split("\n");
	const stack = lines
		.filter((line) => STACK_FRAME_PATTERN.test(line))
		.slice(0, 16);
	return withCritical("stack-trace", text, [
		`stack trace lines: ${stack.length}`,
		...stack,
	]);
}

function summarizeGeneric(text: string): FallbackSummary {
	const critical = criticalLines(text);
	return withCritical("generic", text, [
		`critical lines: ${critical.length}`,
		...critical.slice(0, 16),
	]);
}

function withCritical(
	kind: CompactionKind,
	text: string,
	summary: string[],
): FallbackSummary {
	const criticalContext = criticalLines(text);
	const warnings =
		criticalContext.length === 0
			? ["No decision-critical lines were detected by fallback compactor."]
			: [];
	return { kind, criticalContext, summary, warnings };
}

function criticalLines(text: string): string[] {
	const lines = text
		.split("\n")
		.map((line) => line.trimEnd())
		.filter(
			(line) =>
				line.length > 0 &&
				CRITICAL_PATTERNS.some((pattern) => pattern.test(line)),
		);
	return [...new Set(lines)].slice(0, 80);
}
