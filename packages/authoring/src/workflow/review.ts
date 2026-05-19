import { readFile } from "node:fs/promises";
import {
	deterministicDigest,
	redactSecrets,
	sortStrings,
	stableJson,
} from "reporting";

export type ReviewDecision = "approve" | "deny" | "needs-edit" | "blocked";

export interface ReviewArtifact {
	schemaVersion: 1;
	command: "review plan" | "review diff";
	digest: string;
	decision: ReviewDecision;
	reasons: string[];
	annotations: Array<{
		level: "info" | "warning" | "error";
		message: string;
		path?: string;
	}>;
	feedbackMarkdown: string;
	audit: string[];
}

const DIFF_FILE_PATTERN = /^diff --git a\/(.+?) b\/(.+)$/;

export async function reviewPlanFile(
	planFile: string,
): Promise<ReviewArtifact> {
	const text = await readFile(planFile, "utf8");
	const parsed = parseJsonObject(text);
	const digest = deterministicDigest(parsed ?? text);
	const reasons: string[] = [];
	const annotations: ReviewArtifact["annotations"] = [];
	const writes = arrayOfStrings(parsed?.["writes"] ?? parsed?.["writePaths"]);
	const allowedPaths = arrayOfStrings(parsed?.["allowedPaths"]);
	const approved =
		parsed?.["approved"] === true || parsed?.["decision"] === "approve";
	const approvedDigest =
		typeof parsed?.["approvedDigest"] === "string"
			? parsed["approvedDigest"]
			: undefined;
	if (writes.length > 0 && !approved)
		reasons.push("unapproved write plan blocked");
	if (writes.some((writePath) => !allowedPaths.includes(writePath)))
		reasons.push("write path missing from allowlist");
	if (approvedDigest !== undefined && approvedDigest !== digest)
		reasons.push("approval digest mismatch blocks continuation");
	for (const writePath of writes)
		annotations.push({
			level: "warning",
			message: "planned write requires Hephaestus gate",
			path: writePath,
		});
	return artifact(
		"review plan",
		digest,
		reasons.length === 0 ? "approve" : "blocked",
		reasons,
		annotations,
	);
}

export async function reviewDiffFile(
	diffFile: string,
): Promise<ReviewArtifact> {
	const text = await readFile(diffFile, "utf8");
	const redacted = redactSecrets(text);
	const digest = deterministicDigest(redacted.text);
	const changedFiles = changedFilesFromDiff(redacted.text);
	const deletedFiles = deletedFilesFromDiff(redacted.text);
	const reasons = [
		...(redacted.redactions.length > 0
			? ["secret-looking diff content redacted"]
			: []),
		...(deletedFiles.length > 0
			? ["deleted files require reviewer attention"]
			: []),
	];
	const annotations = [
		...changedFiles.map((filePath) => ({
			level: "info" as const,
			message: "changed file",
			path: filePath,
		})),
		...deletedFiles.map((filePath) => ({
			level: "warning" as const,
			message: "deleted file",
			path: filePath,
		})),
	];
	return artifact(
		"review diff",
		digest,
		reasons.length === 0 ? "approve" : "needs-edit",
		reasons,
		annotations,
	);
}

function artifact(
	command: ReviewArtifact["command"],
	digest: string,
	decision: ReviewDecision,
	reasons: string[],
	annotations: ReviewArtifact["annotations"],
): ReviewArtifact {
	const sortedReasons = sortStrings(reasons);
	return {
		schemaVersion: 1,
		command,
		digest,
		decision,
		reasons: sortedReasons,
		annotations: annotations.sort((left, right) =>
			`${left.path ?? ""}:${left.message}`.localeCompare(
				`${right.path ?? ""}:${right.message}`,
			),
		),
		feedbackMarkdown: [
			`# Olympi ${command}`,
			"",
			`Decision: ${decision}`,
			...sortedReasons.map((reason) => `- ${reason}`),
		].join("\n"),
		audit: [stableJson({ command, decision, digest, reasons: sortedReasons })],
	};
}

function parseJsonObject(text: string): Record<string, unknown> | null {
	try {
		const parsed = JSON.parse(text) as unknown;
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function arrayOfStrings(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((entry): entry is string => typeof entry === "string").sort()
		: [];
}

function changedFilesFromDiff(text: string): string[] {
	const files: string[] = [];
	for (const line of text.split("\n")) {
		const match = line.match(DIFF_FILE_PATTERN);
		if (match?.[2] !== undefined) files.push(match[2]);
	}
	return sortStrings(files);
}

function deletedFilesFromDiff(text: string): string[] {
	const files: string[] = [];
	let current: string | undefined;
	for (const line of text.split("\n")) {
		const match = line.match(DIFF_FILE_PATTERN);
		if (match?.[2] !== undefined) current = match[2];
		if (line.startsWith("deleted file mode") && current !== undefined)
			files.push(current);
	}
	return sortStrings(files);
}
