import { readFile } from "node:fs/promises";
import { fileExists } from "lifecycle";
import { deterministicDigest, redactSecrets, sortStrings } from "reporting";

export interface PromptContractArtifact {
	schemaVersion: 1;
	command: "prompt contract";
	goal: string;
	context: string;
	constraints: string[];
	inspectedSurfaces: string[];
	allowedMutations: string[];
	forbiddenMutations: string[];
	acceptanceCriteria: string[];
	verificationCommands: string[];
	riskFlags: string[];
	stopConditions: string[];
	compactOutput: true;
	redactions: string[];
	digest: string;
}

const PATH_PATTERN = /(?:^|\s)([./~][\w./-]+|[\w.-]+\/(?:[\w./-]+))/g;
const CONSTRAINT_PATTERN = /constraint|must|do not|never|forbidden/i;
const VERIFICATION_PATTERN =
	/bun |npm |test|typecheck|biome|verify|git diff --check/i;
const MUTATION_PATTERN = /write|apply|edit|delete|remove/i;
const SECRET_OR_GLOBAL_PATTERN = /~\/\.pi|\.ssh|secret|token|api[_-]?key/i;
const OUTPUT_HEAVY_PATTERN = /large|diff|test output|logs?/i;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:]$/g;

export async function buildPromptContract(
	inputOrFile: string,
): Promise<PromptContractArtifact> {
	const sourceText = (await fileExists(inputOrFile))
		? await readFile(inputOrFile, "utf8")
		: inputOrFile;
	return promptContractFromText(sourceText);
}

export function promptContractFromText(
	sourceText: string,
): PromptContractArtifact {
	const redacted = redactSecrets(sourceText);
	const lines = redacted.text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	const constraints = lines.filter((line) => CONSTRAINT_PATTERN.test(line));
	const verification = lines.filter((line) => VERIFICATION_PATTERN.test(line));
	const paths = extractPaths(redacted.text);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "prompt contract" as const,
		goal: lines[0] ?? "unspecified goal",
		context: redacted.text.slice(0, 600),
		constraints:
			constraints.length === 0
				? ["preserve user-stated paths, constraints, and non-goals"]
				: constraints,
		inspectedSurfaces: paths,
		allowedMutations: ["explicitly requested project-local files only"],
		forbiddenMutations: [
			"~/.pi writes",
			"third-party package execution",
			"cleanup",
			"external server",
			"uncontrolled swarm behavior",
		],
		acceptanceCriteria: [
			"contract preserves user paths/constraints",
			"verification commands are explicit",
			"compact output is default",
		],
		verificationCommands:
			verification.length === 0
				? ["bun run olympi:test", "bunx tsc --noEmit", "git diff --check"]
				: verification,
		riskFlags: riskFlags(redacted.text),
		stopConditions: [
			"blocked safety gate",
			"missing approval",
			"unclear mutation scope",
		],
		compactOutput: true as const,
		redactions: redacted.redactions,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

function extractPaths(text: string): string[] {
	const paths: string[] = [];
	for (const match of text.matchAll(PATH_PATTERN)) {
		const value = match[1];
		if (value?.includes("/"))
			paths.push(value.replace(TRAILING_PUNCTUATION_PATTERN, ""));
	}
	return sortStrings(paths);
}

function riskFlags(text: string): string[] {
	const flags: string[] = [];
	if (MUTATION_PATTERN.test(text)) flags.push("mutation-requested");
	if (SECRET_OR_GLOBAL_PATTERN.test(text))
		flags.push("secret-or-global-path-mentioned");
	if (OUTPUT_HEAVY_PATTERN.test(text))
		flags.push("output-heavy-use-rtk-if-available");
	return flags.length === 0 ? ["none-detected"] : flags.sort();
}
