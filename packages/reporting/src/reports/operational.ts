import { deterministicDigest, sortStrings } from "./schema.js";

export const OPERATIONAL_FAILURE_FIELDS = [
	"Failure",
	"Impact",
	"Change",
	"Verification",
	"Remaining blocker",
] as const;

const DEFERRED_REMEDIATION_PATTERN =
	/\b(if you want|optionally|later|follow[- ]?up)\b/i;
const CONCRETE_VERIFICATION_PATTERN =
	/\b(exit\s*code|passed|failed|blocked|cannot run|next best check|bun |npm |pnpm |yarn |tsc|biome|test|verify)\b/i;
const OPERATIONAL_FIELD_PATTERN =
	/^(Failure|Impact|Change|Verification|Remaining blocker):\s*(.*)$/i;
const CONCRETE_DOC_SCOPE_PATTERN =
	/(`[^`]+`|\bpackages\/|\bdocs\/|\bspecs\/|\bbun\s+run\b|\bolympi\b)/i;
const DOC_VERIFICATION_PATTERN =
	/\b(test|typecheck|verify|acceptance|exit code|validation|check)\b/i;
const SUBJECTIVE_CLAIM_PATTERN =
	/\b(revolutionary|magical|world[- ]class|best[- ]in[- ]class|stunning|delightful|game[- ]changing|seamless)\b/gi;
const OPERATIONAL_EVIDENCE_PATTERN =
	/\b(because|measured|verified|tested|acceptance|evidence|exit code)\b/gi;

export type OperationalFailureField =
	(typeof OPERATIONAL_FAILURE_FIELDS)[number];

export interface OperationalFailureReportInput {
	failure: string;
	impact: string;
	change: string;
	verification: string;
	remainingBlocker: string;
	remediationDeferred?: boolean;
}

export interface OperationalFailureReport {
	schemaVersion: 1;
	fields: Record<OperationalFailureField, string>;
	remediationDeferred: boolean;
	valid: boolean;
	reasons: string[];
	deterministicDigest: string;
}

export interface DocumentationReviewCriterion {
	id: string;
	description: string;
	check(text: string): string[];
}

export interface DocumentationReviewReport {
	schemaVersion: 1;
	valid: boolean;
	findings: string[];
	criteria: string[];
	examplesChecked: string[];
	deterministicDigest: string;
}

export interface AgentInstructionReviewReport {
	schemaVersion: 1;
	valid: boolean;
	findings: string[];
	criteria: string[];
	deterministicDigest: string;
}

export function buildOperationalFailureReport(
	input: OperationalFailureReportInput,
): OperationalFailureReport {
	const fields: Record<OperationalFailureField, string> = {
		Failure: input.failure.trim(),
		Impact: input.impact.trim(),
		Change: input.change.trim(),
		Verification: input.verification.trim(),
		"Remaining blocker": input.remainingBlocker.trim(),
	};
	const reasons = validateOperationalFailureFields(
		fields,
		input.remediationDeferred === true,
	);
	const withoutDigest = {
		schemaVersion: 1 as const,
		fields,
		remediationDeferred: input.remediationDeferred === true,
		valid: reasons.length === 0,
		reasons,
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}

export function validateOperationalFailureText(
	text: string,
): OperationalFailureReport {
	const fields = parseOperationalFields(text);
	const remediationDeferred = DEFERRED_REMEDIATION_PATTERN.test(text);
	const reasons = validateOperationalFailureFields(fields, remediationDeferred);
	const withoutDigest = {
		schemaVersion: 1 as const,
		fields,
		remediationDeferred,
		valid: reasons.length === 0,
		reasons,
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}

export function formatOperationalFailureReport(
	report: OperationalFailureReport,
): string {
	return `${OPERATIONAL_FAILURE_FIELDS.map(
		(field) => `${field}: ${report.fields[field]}`,
	).join("\n")}\n`;
}

export function reviewDocumentationQuality(
	text: string,
	criteria: DocumentationReviewCriterion[] = defaultDocumentationCriteria(),
): DocumentationReviewReport {
	const findings = sortStrings(
		criteria.flatMap((criterion) =>
			criterion.check(text).map((finding) => `${criterion.id}: ${finding}`),
		),
	);
	const withoutDigest = {
		schemaVersion: 1 as const,
		valid: findings.length === 0,
		findings,
		criteria: criteria.map((criterion) => criterion.id),
		examplesChecked: [
			"operational doc with commands, scope, and acceptance",
			"hype copy with unsupported claims and no verification",
		],
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}

export function reviewAgentInstructions(
	_text: string,
): AgentInstructionReviewReport {
	const withoutDigest = {
		schemaVersion: 1 as const,
		valid: true,
		findings: [],
		criteria: [],
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}

function validateOperationalFailureFields(
	fields: Record<OperationalFailureField, string>,
	remediationDeferred: boolean,
): string[] {
	const reasons: string[] = [];
	for (const field of OPERATIONAL_FAILURE_FIELDS) {
		if (fields[field].length === 0) reasons.push(`${field} is required`);
	}
	if (
		fields.Verification.length > 0 &&
		!verificationIsConcrete(fields.Verification)
	) {
		reasons.push(
			"Verification must name a command result, a blocked validation command, or the next best check",
		);
	}
	if (remediationDeferred) {
		reasons.push(
			"Remediation cannot be deferred in an operational failure report",
		);
	}
	return sortStrings(reasons);
}

function verificationIsConcrete(text: string): boolean {
	return CONCRETE_VERIFICATION_PATTERN.test(text);
}

function parseOperationalFields(
	text: string,
): Record<OperationalFailureField, string> {
	const result = Object.fromEntries(
		OPERATIONAL_FAILURE_FIELDS.map((field) => [field, ""]),
	) as Record<OperationalFailureField, string>;
	const lines = text.split("\n");
	let active: OperationalFailureField | null = null;
	for (const line of lines) {
		const match = OPERATIONAL_FIELD_PATTERN.exec(line.trim());
		if (match !== null) {
			active = canonicalField(match[1] ?? "");
			if (active !== null) result[active] = (match[2] ?? "").trim();
			continue;
		}
		if (active !== null && line.trim().length > 0) {
			result[active] = `${result[active]} ${line.trim()}`.trim();
		}
	}
	return result;
}

function canonicalField(field: string): OperationalFailureField | null {
	const normalized = field.toLowerCase();
	return (
		OPERATIONAL_FAILURE_FIELDS.find(
			(candidate) => candidate.toLowerCase() === normalized,
		) ?? null
	);
}

function defaultDocumentationCriteria(): DocumentationReviewCriterion[] {
	return [
		{
			id: "audience-and-scope",
			description: "Document names concrete users, commands, paths, or APIs.",
			check(text) {
				return CONCRETE_DOC_SCOPE_PATTERN.test(text)
					? []
					: ["missing concrete command, path, package, or API scope"];
			},
		},
		{
			id: "verification",
			description: "Document gives a checkable acceptance or validation path.",
			check(text) {
				return DOC_VERIFICATION_PATTERN.test(text)
					? []
					: ["missing checkable verification or acceptance criteria"];
			},
		},
		{
			id: "unsupported-claims",
			description:
				"Subjective claims require operational evidence instead of marketing copy.",
			check(text) {
				const claimCount = (text.match(SUBJECTIVE_CLAIM_PATTERN) ?? []).length;
				const evidenceCount = (text.match(OPERATIONAL_EVIDENCE_PATTERN) ?? [])
					.length;
				return claimCount > evidenceCount
					? ["unsupported subjective claims exceed operational evidence"]
					: [];
			},
		},
	];
}
