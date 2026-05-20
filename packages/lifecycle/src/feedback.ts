import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type FeedbackSource =
	| "user-correction"
	| "failed-verification"
	| "repeated-blocker"
	| "bad-command-surface"
	| "stale-docs-help"
	| "policy-gap"
	| "hook-gap"
	| "skill-gap"
	| "code-intelligence-gap"
	| "provider-broker-gap";
export type FeedbackClassification =
	| "policy"
	| "hook"
	| "skill"
	| "test/eval"
	| "docs correction"
	| "code-intelligence gap"
	| "provider contract gap"
	| "broker/sandbox gap"
	| "product requirement"
	| "rejected/non-product";
export type FeedbackStatus =
	| "implemented"
	| "blocked with concrete reason"
	| "rejected with reason";

export interface FeedbackItemInput {
	source: FeedbackSource;
	observedProblem: string;
	evidence: string[];
	affected: string[];
	status?: FeedbackStatus;
	statusReason?: string;
}

export interface FeedbackItem extends FeedbackItemInput {
	schemaVersion: 1;
	id: string;
	createdAt: string;
	owningPackage: string;
	classification: FeedbackClassification;
	status: FeedbackStatus;
	statusReason: string;
}

export interface FeedbackReport {
	schemaVersion: 1;
	command: "feedback list";
	statePath: string;
	items: FeedbackItem[];
	openConcreteBlockers: FeedbackItem[];
}

const FEEDBACK_RELATIVE_PATH = ".pi/olympi/feedback/items.json";

export async function recordFeedbackItem(
	projectRoot: string,
	input: FeedbackItemInput,
): Promise<FeedbackItem> {
	const item: FeedbackItem = {
		schemaVersion: 1,
		id: stableFeedbackId(input),
		createdAt: new Date().toISOString(),
		...input,
		owningPackage: inferOwner(input),
		classification: classifyFeedback(input),
		status: input.status ?? "blocked with concrete reason",
		statusReason: input.statusReason ?? concreteReason(input),
	};
	const items = await readFeedbackItems(projectRoot);
	const next = [
		...items.filter((existing) => existing.id !== item.id),
		item,
	].sort((left, right) => left.id.localeCompare(right.id));
	const target = path.join(path.resolve(projectRoot), FEEDBACK_RELATIVE_PATH);
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, `${JSON.stringify(next, null, 2)}\n`);
	return item;
}

export async function readFeedbackReport(
	projectRoot: string = process.cwd(),
): Promise<FeedbackReport> {
	const items = await readFeedbackItems(projectRoot);
	return {
		schemaVersion: 1,
		command: "feedback list",
		statePath: FEEDBACK_RELATIVE_PATH,
		items,
		openConcreteBlockers: items.filter(
			(item) => item.status === "blocked with concrete reason",
		),
	};
}

export async function readFeedbackItems(
	projectRoot: string,
): Promise<FeedbackItem[]> {
	try {
		return JSON.parse(
			await readFile(
				path.join(path.resolve(projectRoot), FEEDBACK_RELATIVE_PATH),
				"utf8",
			),
		) as FeedbackItem[];
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			(error as { code?: unknown }).code === "ENOENT"
		)
			return [];
		throw error;
	}
}

function classifyFeedback(input: FeedbackItemInput): FeedbackClassification {
	switch (input.source) {
		case "failed-verification":
			return "test/eval";
		case "stale-docs-help":
			return "docs correction";
		case "policy-gap":
			return "policy";
		case "hook-gap":
			return "hook";
		case "skill-gap":
			return "skill";
		case "code-intelligence-gap":
			return "code-intelligence gap";
		case "provider-broker-gap":
			return "provider contract gap";
		case "user-correction":
		case "repeated-blocker":
		case "bad-command-surface":
			break;
		default:
			break;
	}
	const text =
		`${input.source} ${input.observedProblem} ${input.affected.join(" ")}`.toLowerCase();
	switch (true) {
		case text.includes("provider"):
			return "provider contract gap";
		case text.includes("broker") || text.includes("sandbox"):
			return "broker/sandbox gap";
		case text.includes("repo-map") ||
			text.includes("code-intelligence") ||
			text.includes("lsp"):
			return "code-intelligence gap";
		case text.includes("hook"):
			return "hook";
		case text.includes("policy"):
			return "policy";
		case text.includes("skill"):
			return "skill";
		case text.includes("doc") || text.includes("help"):
			return "docs correction";
		case text.includes("test") || text.includes("eval"):
			return "test/eval";
		case text.includes("reject") || text.includes("non-product"):
			return "rejected/non-product";
		default:
			return "product requirement";
	}
}

function inferOwner(input: FeedbackItemInput): string {
	const first = input.affected[0] ?? "product";
	const parts = first.replaceAll("\\", "/").split("/");
	switch (parts[0]) {
		case "packages":
			return parts[1] ?? "packages";
		case "docs":
		case "specs":
			return parts[0];
		default:
			return "product";
	}
}

function concreteReason(input: FeedbackItemInput): string {
	return input.evidence.length > 0
		? `requires implementation evidence: ${input.evidence[0]}`
		: "requires an owner, test, and concrete implementation plan before acceptance";
}

function stableFeedbackId(input: FeedbackItemInput): string {
	let hash = 0;
	for (const char of `${input.source}:${input.observedProblem}:${input.affected.join(",")}`)
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return `feedback-${hash.toString(16).padStart(8, "0")}`;
}
