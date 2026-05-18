import { createHash } from "node:crypto";

export const REPORT_SCHEMA_VERSION = 1 as const;

export interface RedactionResult {
	text: string;
	redactions: string[];
}

const SECRET_PATTERNS: [RegExp, string][] = [
	[/sk-[A-Za-z0-9_-]{12,}/g, "openai-style-api-key"],
	[/sk-clb-[A-Za-z0-9_-]{8,}/g, "codex-lb-api-key"],
	[/github_pat_[A-Za-z0-9_]+/g, "github-token"],
	[/gh[pousr]_[A-Za-z0-9_]{20,}/g, "github-token"],
	[
		/\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+/gi,
		"key-value-secret",
	],
	[
		/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
		"private-key-block",
	],
];

export function redactSecrets(text: string): RedactionResult {
	let result = text;
	const redactions: string[] = [];
	for (const [pattern, label] of SECRET_PATTERNS) {
		let count = 0;
		result = result.replace(pattern, () => {
			count += 1;
			return `[REDACTED:${label}]`;
		});
		if (count > 0) redactions.push(`${label}:${count}`);
	}
	return { text: result, redactions };
}

export function deterministicDigest(value: unknown): string {
	return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

export function stableJson(value: unknown): string {
	return JSON.stringify(sortJson(value));
}

export function stablePrettyJson(value: unknown): string {
	return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sortStrings(values: string[]): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((entry) => sortJson(entry));
	if (typeof value !== "object" || value === null) return value;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		sorted[key] = sortJson((value as Record<string, unknown>)[key]);
	}
	return sorted;
}
