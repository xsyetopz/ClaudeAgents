import { readFile } from "node:fs/promises";
import { deterministicDigest, redactSecrets } from "../reports/schema.js";
import { fallbackCompact, inferCompactionKind } from "./fallback.js";
import { detectRtk, recommendationForKind } from "./rtk.js";
import type {
	CompactionInput,
	CompactionMode,
	CompactionReport,
} from "./types.js";

// biome-ignore lint/performance/noBarrelFile: compaction is a bounded public Olympus module surface.
export { detectRtk } from "./rtk.js";
export type {
	CompactionKind,
	CompactionMode,
	CompactionReport,
	RtkStatusReport,
} from "./types.js";

export async function compactFile(
	filePath: string,
	options: Omit<CompactionInput, "text" | "sourcePath"> = {},
): Promise<CompactionReport> {
	const text = await readFile(filePath, "utf8");
	return compactText({ ...options, text, sourcePath: filePath });
}

export function compactText(input: CompactionInput): CompactionReport {
	const mode: CompactionMode = input.mode ?? "compact";
	const redacted = redactSecrets(input.text);
	const kind =
		input.kind === undefined || input.kind === "auto"
			? inferCompactionKind(redacted.text)
			: input.kind;
	const rtk = detectRtk(input.env);
	const fallback = fallbackCompact(kind, redacted.text);
	const outputText =
		mode === "raw" || mode === "verbose" ? redacted.text : null;
	const summaryText = [
		...fallback.summary,
		...redacted.redactions.map((notice) => `redaction notice: ${notice}`),
	];
	const compactedBytes = Buffer.byteLength(summaryText.join("\n"), "utf8");
	const rawBytes = Buffer.byteLength(redacted.text, "utf8");
	return {
		schemaVersion: 1,
		command: "compact",
		kind,
		mode,
		rtkStatus: rtk.status,
		rtkPath: rtk.path,
		rtkPreferred: rtk.status === "available",
		rtkCommandRecommendation: recommendationForKind(
			kind,
			rtk.status === "available",
		),
		fallbackReason:
			rtk.status === "available"
				? "Offline CLI compaction records RTK preference without executing RTK; fallback summary kept as local safety reference."
				: rtk.degradedReason,
		rawOutputReference: input.sourcePath ?? null,
		exitStatus: input.exitStatus ?? null,
		criticalContext: fallback.criticalContext,
		redactions: redacted.redactions,
		warnings: [
			...fallback.warnings,
			...(redacted.redactions.length > 0
				? ["Secret-looking output was redacted before compaction."]
				: []),
		],
		summary: summaryText,
		rawOutput: outputText,
		savedBytesEstimate: Math.max(rawBytes - compactedBytes, 0),
		tokenEstimateBefore: estimateTokens(redacted.text),
		tokenEstimateAfter: estimateTokens(summaryText.join("\n")),
		deterministicDigest: deterministicDigest({
			kind,
			mode,
			text: redacted.text,
			exitStatus: input.exitStatus ?? null,
		}),
	};
}

function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}
