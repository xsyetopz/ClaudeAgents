import { deterministicDigest, sortStrings } from "reporting";

export type SkillModelTier =
	| "cheap-worker"
	| "standard-worker"
	| "strong-reviewer";

const ONE_OFF_SKILL_FIX_PATTERN =
	/specific file|line \d+|only this task|hardcode/i;
const VALIDATION_FAILURE_PATTERN = /validation|test|verify/i;
const ARCHITECTURE_FAILURE_PATTERN = /architecture|boundary|package/i;
const BLOCKER_FAILURE_PATTERN = /blocked|credential|missing|unavailable/i;
const WHITESPACE_PATTERN = /\s+/g;

export interface SkillIndexMetadata {
	schemaVersion: 1;
	name: string;
	title: string;
	description: string;
	topics: string[];
	triggers: string[];
	modelTier: SkillModelTier;
	supportFiles: string[];
	verificationCommands: string[];
}

export interface LoadedSkill {
	metadata: SkillIndexMetadata;
	body: string;
	supportFiles: Array<{ path: string; content: string }>;
	digest: string;
}

export interface IndexedSkill {
	metadata: SkillIndexMetadata;
	load(): LoadedSkill | Promise<LoadedSkill>;
}

export interface SkillRegistry {
	schemaVersion: 1;
	skills: IndexedSkill[];
}

export interface SkillSelection {
	metadata: SkillIndexMetadata;
	score: number;
	matchedTopics: string[];
	matchedTriggers: string[];
	load(): LoadedSkill | Promise<LoadedSkill>;
}

export interface SkillRefinementProposal {
	schemaVersion: 1;
	skillName: string;
	decision: "refine" | "do-not-refine";
	generalizedLesson: string | null;
	proposedText: string | null;
	runOnSmallSubsetFirst: boolean;
	reasons: string[];
	digest: string;
}

export const FIRST_PARTY_SKILL_INDEX: SkillIndexMetadata[] = [
	skill(
		"goal-loop-orchestration",
		"Goal Loop Orchestration",
		"Plan, run, pause, verify, and recover bounded long-running objectives.",
		["goal", "orchestration", "continuation", "blocker"],
		["goal", "loop", "blocked", "continue", "completion", "verification"],
		"strong-reviewer",
		["olympi goal-loop tests"],
	),
	skill(
		"implementation-worker",
		"Implementation Worker",
		"Make repeatable scoped edits from an approved plan with targeted evidence.",
		["implementation", "worker", "refactor"],
		["implement", "edit", "refactor", "fix"],
		"cheap-worker",
		["bun run olympi:test", "bun run typecheck"],
	),
	skill(
		"reviewer-audit",
		"Reviewer Audit",
		"Audit worker output for correctness, architecture boundaries, and validation gaps.",
		["review", "audit", "validation"],
		["review", "audit", "diff", "regression"],
		"strong-reviewer",
		["bun run biome:check", "git diff --check"],
	),
	skill(
		"caveman-output",
		"Caveman Output",
		"Compress prose only when requested while preserving exact technical tokens and validation evidence.",
		["caveman", "compact", "output"],
		["caveman", "compact", "terse", "wenyan"],
		"cheap-worker",
		["stop hook cavemanCompliant signal"],
	),
	skill(
		"systemic-debugging",
		"Systemic Debugging",
		"Diagnose concrete blockers by reproducing symptoms and changing one variable at a time.",
		["debug", "blocker", "failure"],
		["blocked", "failing", "error", "debug", "root cause"],
		"strong-reviewer",
		["targeted failing command"],
	),
];

export function createSkillRegistry(
	skills: IndexedSkill[] = FIRST_PARTY_SKILL_INDEX.map(indexedFromMetadata),
): SkillRegistry {
	return { schemaVersion: 1, skills };
}

export function selectTopicalSkills(
	registry: SkillRegistry,
	input: { text: string; topics?: string[]; limit?: number },
): SkillSelection[] {
	const text = input.text.toLowerCase();
	const requestedTopics = new Set(
		(input.topics ?? []).map((topic) => topic.toLowerCase()),
	);
	return registry.skills
		.map((entry) => scoreSkill(entry, text, requestedTopics))
		.filter((selection) => selection.score > 0)
		.sort((left, right) =>
			right.score === left.score
				? left.metadata.name.localeCompare(right.metadata.name)
				: right.score - left.score,
		)
		.slice(0, input.limit ?? 3);
}

export async function loadSelectedSkills(
	selections: SkillSelection[],
): Promise<LoadedSkill[]> {
	const loaded: LoadedSkill[] = [];
	for (const selection of selections) loaded.push(await selection.load());
	return loaded;
}

export function proposeSkillRefinement(options: {
	skillName: string;
	workerFailure: string;
	reviewerFindings: string[];
	repeatedPattern: boolean;
}): SkillRefinementProposal {
	const findings = options.reviewerFindings.filter(
		(finding) => finding.trim().length > 0,
	);
	const oneOff = ONE_OFF_SKILL_FIX_PATTERN.test(
		`${options.workerFailure}\n${findings.join("\n")}`,
	);
	const shouldRefine =
		options.repeatedPattern && findings.length > 0 && !oneOff;
	const generalizedLesson = shouldRefine
		? generalizeLesson(options.workerFailure, findings)
		: null;
	const withoutDigest = {
		schemaVersion: 1 as const,
		skillName: options.skillName,
		decision: shouldRefine ? ("refine" as const) : ("do-not-refine" as const),
		generalizedLesson,
		proposedText:
			generalizedLesson === null
				? null
				: `When this pattern appears, ${generalizedLesson}. Validate on one representative slice before scaling.`,
		runOnSmallSubsetFirst: shouldRefine,
		reasons: shouldRefine
			? ["repeated general failure pattern identified by reviewer"]
			: ["no generalized repeated pattern suitable for skill update"],
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

function indexedFromMetadata(metadata: SkillIndexMetadata): IndexedSkill {
	return {
		metadata,
		load() {
			const body = [
				`# ${metadata.title}`,
				"",
				metadata.description,
				"",
				`Model tier: ${metadata.modelTier}`,
				`Topics: ${metadata.topics.join(", ")}`,
				`Validation: ${metadata.verificationCommands.join(", ")}`,
			].join("\n");
			return loadedSkill(metadata, body, []);
		},
	};
}

function scoreSkill(
	entry: IndexedSkill,
	text: string,
	requestedTopics: Set<string>,
): SkillSelection {
	const matchedTopics = entry.metadata.topics.filter(
		(topic) => requestedTopics.has(topic.toLowerCase()) || text.includes(topic),
	);
	const matchedTriggers = entry.metadata.triggers.filter((trigger) =>
		text.includes(trigger.toLowerCase()),
	);
	return {
		metadata: entry.metadata,
		score: matchedTopics.length * 2 + matchedTriggers.length,
		matchedTopics: sortStrings(matchedTopics),
		matchedTriggers: sortStrings(matchedTriggers),
		load: entry.load,
	};
}

function loadedSkill(
	metadata: SkillIndexMetadata,
	body: string,
	supportFiles: Array<{ path: string; content: string }>,
): LoadedSkill {
	const withoutDigest = { metadata, body, supportFiles };
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

function skill(
	name: string,
	title: string,
	description: string,
	topics: string[],
	triggers: string[],
	modelTier: SkillModelTier,
	verificationCommands: string[],
): SkillIndexMetadata {
	return {
		schemaVersion: 1,
		name,
		title,
		description,
		topics: sortStrings(topics),
		triggers: sortStrings(triggers),
		modelTier,
		supportFiles: [`resources/skills/${name}/README.md`],
		verificationCommands,
	};
}

function generalizeLesson(workerFailure: string, findings: string[]): string {
	const compact = [workerFailure, ...findings]
		.join(" ")
		.replace(WHITESPACE_PATTERN, " ")
		.trim();
	if (VALIDATION_FAILURE_PATTERN.test(compact)) {
		return "require explicit validation evidence before marking work complete";
	}
	if (ARCHITECTURE_FAILURE_PATTERN.test(compact)) {
		return "identify the owning package and boundary rule before editing";
	}
	if (BLOCKER_FAILURE_PATTERN.test(compact)) {
		return "pause on concrete blockers and report the exact needed input";
	}
	return "turn the reviewer finding into a topical rule that applies beyond one task";
}
