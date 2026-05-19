import { deterministicDigest } from "./reports/schema.js";

/*
 * Mirrors the installed Pi footer renderer contract, not a single observed
 * statusline sample.  In `@earendil-works/pi-coding-agent`'s built-in footer,
 * `AgentSession.getContextUsage()` provides `{ tokens, contextWindow, percent };`
 * `FooterComponent` then renders the context segment as either:
 *   ``${percent.toFixed(1)}%/${formatTokens(contextWindow)}${autoIndicator}``
 * or, immediately after compaction when tokens are unknown:
 *   ``?/${formatTokens(contextWindow)}${autoIndicator}``.
 * See the locally installed package inspected for this phase:
 * - `dist/core/agent-session.js getContextUsage()`
 * - `dist/modes/interactive/components/footer.js render()/formatTokens()`
 */
const PI_FOOTER_CONTEXT_PATTERN =
	/(?:^|\s)(\?|[0-9]+(?:\.[0-9]+)?%?)\/([0-9]+(?:\.[0-9]+)?)([kKmM]?)(?:\s+\((auto)\))?(?=\s|$)/g;
const INPUT_TOKENS_PATTERN = /↑([0-9]+(?:\.[0-9]+)?)([kKmM]?)/;
const OUTPUT_TOKENS_PATTERN = /↓([0-9]+(?:\.[0-9]+)?)([kKmM]?)/;
const RUN_TOKENS_PATTERN = /\bR([0-9]+(?:\.[0-9]+)?)([kKmM]?)/;
const COST_PATTERN = /\$([0-9]+(?:\.[0-9]+)?)/;
const MODE_PATTERN = /\(([^)]+)\)\s*$/;
const ANSI_PATTERN = new RegExp(
	`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
	"g",
);

export interface PiStatuslineContext {
	schemaVersion: 1;
	source: "pi-statusline";
	raw: string;
	contextSource: "pi-footer-getContextUsage";
	contextSegment: string | null;
	contextPercent: number | null;
	contextWindowTokens: number | null;
	contextUsedTokensEstimate: number | null;
	autoCompact: boolean | null;
	inputTokens: number | null;
	outputTokens: number | null;
	runTokens: number | null;
	costUsd: number | null;
	mode: string | null;
	parseWarnings: string[];
	digest: string;
}

export interface ContextCompactionAdvice {
	schemaVersion: 1;
	command: "context compact-advice";
	afterHandoff: boolean;
	thresholdPercent: number;
	statusline: PiStatuslineContext;
	shouldRunPiCompact: boolean;
	nextCommand: "/compact" | null;
	reasons: string[];
	digest: string;
}

export function parsePiStatusline(statusline: string): PiStatuslineContext {
	const raw = statusline.trim();
	const normalized = stripAnsi(raw);
	const contextMatch = lastMatch(normalized, PI_FOOTER_CONTEXT_PATTERN);
	const contextPercent = percentFromMatch(contextMatch, 1);
	const contextWindowTokens = tokensFromMatch(contextMatch, 2, 3);
	const contextSegment = contextMatch?.[0]?.trim() ?? null;
	const withoutDigest = {
		schemaVersion: 1 as const,
		source: "pi-statusline" as const,
		raw,
		contextSource: "pi-footer-getContextUsage" as const,
		contextSegment,
		contextPercent,
		contextWindowTokens,
		contextUsedTokensEstimate:
			contextPercent === null || contextWindowTokens === null
				? null
				: Math.round((contextPercent / 100) * contextWindowTokens),
		autoCompact: contextMatch === null ? null : contextMatch[4] === "auto",
		inputTokens: tokensFromMatch(raw.match(INPUT_TOKENS_PATTERN), 1, 2),
		outputTokens: tokensFromMatch(raw.match(OUTPUT_TOKENS_PATTERN), 1, 2),
		runTokens: tokensFromMatch(raw.match(RUN_TOKENS_PATTERN), 1, 2),
		costUsd: numberFromMatch(raw.match(COST_PATTERN), 1),
		mode: modeFromStatusline(raw),
		parseWarnings: contextWarnings(contextMatch, contextPercent),
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

export function buildContextCompactionAdvice(options: {
	statusline: string;
	afterHandoff: boolean;
	thresholdPercent?: number;
}): ContextCompactionAdvice {
	const thresholdPercent = options.thresholdPercent ?? 50;
	const parsed = parsePiStatusline(options.statusline);
	const reasons: string[] = [];
	if (!options.afterHandoff) {
		reasons.push("handoff has not been marked complete");
	}
	if (parsed.contextPercent === null) {
		reasons.push("current Pi context percentage is unknown");
	} else if (parsed.contextPercent < thresholdPercent) {
		reasons.push(
			`current Pi context ${parsed.contextPercent}% is below ${thresholdPercent}% threshold`,
		);
	} else {
		reasons.push(
			`current Pi context ${parsed.contextPercent}% is at or above ${thresholdPercent}% threshold`,
		);
	}
	const shouldRunPiCompact =
		options.afterHandoff &&
		parsed.contextPercent !== null &&
		parsed.contextPercent >= thresholdPercent;
	if (shouldRunPiCompact) {
		reasons.push(
			"post-handoff compaction is recommended before more agent work",
		);
	}
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "context compact-advice" as const,
		afterHandoff: options.afterHandoff,
		thresholdPercent,
		statusline: parsed,
		shouldRunPiCompact,
		nextCommand: shouldRunPiCompact ? ("/compact" as const) : null,
		reasons,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

function numberFromMatch(
	match: RegExpMatchArray | null,
	index: number,
): number | null {
	const value = match?.[index];
	if (value === undefined) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function percentFromMatch(
	match: RegExpMatchArray | null,
	index: number,
): number | null {
	const value = match?.[index];
	if (value === undefined || value === "?") return null;
	const parsed = Number(value.endsWith("%") ? value.slice(0, -1) : value);
	return Number.isFinite(parsed) ? parsed : null;
}

function tokensFromMatch(
	match: RegExpMatchArray | null,
	valueIndex: number,
	unitIndex: number,
): number | null {
	const base = numberFromMatch(match, valueIndex);
	if (base === null) return null;
	const unit = match?.[unitIndex]?.toLowerCase() ?? "";
	if (unit === "m") return Math.round(base * 1_000_000);
	if (unit === "k") return Math.round(base * 1_000);
	return Math.round(base);
}

function modeFromStatusline(statusline: string): string | null {
	const match = statusline.match(MODE_PATTERN);
	return match?.[1] ?? null;
}

function stripAnsi(value: string): string {
	return value.replace(ANSI_PATTERN, "");
}

function lastMatch(value: string, pattern: RegExp): RegExpMatchArray | null {
	let result: RegExpMatchArray | null = null;
	for (const match of value.matchAll(pattern)) result = match;
	return result;
}

function contextWarnings(
	contextMatch: RegExpMatchArray | null,
	contextPercent: number | null,
): string[] {
	if (contextMatch === null) {
		return [
			"Pi footer context segment rendered from getContextUsage was not found",
		];
	}
	if (contextPercent === null) {
		return [
			"Pi reports current context tokens as unknown, usually immediately after compaction before the next LLM response",
		];
	}
	return [];
}
