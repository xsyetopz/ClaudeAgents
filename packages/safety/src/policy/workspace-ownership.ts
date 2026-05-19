import type {
	AgentCommandClass,
	CommandClassificationAudit,
	OwnershipProof,
	PolicyEvent,
	WorkspaceOperation,
} from "./types.js";

const OWNERSHIP_PROOFS = new Set<OwnershipProof>([
	"manifest-hash",
	"provenance-record",
	"agent-created-this-run",
	"explicit-user-approval",
]);

const REVISION_COMMANDS = new Set(["checkout", "restore", "reset", "clean"]);
const FORMAT_COMMANDS = new Set(["format", "fmt"]);
const FIX_FLAGS = new Set(["--write", "--fix"]);
const TOKEN_SPLIT_PATTERN = /\s+/;
const TOKEN_QUOTE_TRIM_PATTERN = /^['"]|['"]$/g;
const PACKAGE_FORMAT_SCRIPT_PATTERN =
	/biome:(format|check:fix|lint:fix)|format:write/;
const READ_ONLY_GIT_COMMANDS = new Set([
	"status",
	"diff",
	"log",
	"show",
	"rev-parse",
	"branch",
	"ls-files",
]);
const READ_ONLY_SHELL_COMMANDS = new Set([
	"cat",
	"grep",
	"rg",
	"sed",
	"awk",
	"ls",
	"pwd",
	"find",
	"wc",
	"head",
	"tail",
]);

export interface CommandClassPolicy {
	className: AgentCommandClass;
	allowedPreconditions: string[];
	requiredProvenanceChecks: string[];
	blockerBehavior: string;
	auditOutput: string[];
	requiresOwnershipProof: boolean;
	blocksWhenAmbiguous: boolean;
	writesWorkspace: boolean;
}

export interface WorkspaceCommandClassification {
	primaryClass: AgentCommandClass;
	classes: AgentCommandClass[];
	operation: WorkspaceOperation | null;
	reasons: string[];
	paths: string[];
	requiresOwnershipProof: boolean;
	blocksWhenAmbiguous: boolean;
	writesWorkspace: boolean;
	policy: CommandClassPolicy;
	audit: CommandClassificationAudit;
}

const COMMAND_CLASS_POLICIES: Record<AgentCommandClass, CommandClassPolicy> = {
	"read-only-inspection": {
		className: "read-only-inspection",
		allowedPreconditions: ["command is limited to read-only inspection"],
		requiredProvenanceChecks: ["none for read-only inspection"],
		blockerBehavior:
			"allow unless another policy detects protected paths or secrets",
		auditOutput: ["class", "paths", "read-only decision"],
		requiresOwnershipProof: false,
		blocksWhenAmbiguous: false,
		writesWorkspace: false,
	},
	"formatting-write": {
		className: "formatting-write",
		allowedPreconditions: [
			"paths are explicitly scoped",
			"each path has ownership proof or explicit user approval",
		],
		requiredProvenanceChecks: [
			"manifest hash, provenance record, same-run agent provenance, or explicit user approval",
		],
		blockerBehavior:
			"block broad or ambiguous formatter writes and report prevented paths",
		auditOutput: ["class", "paths", "ownership proof", "blocker behavior"],
		requiresOwnershipProof: true,
		blocksWhenAmbiguous: true,
		writesWorkspace: true,
	},
	"destructive-workspace": {
		className: "destructive-workspace",
		allowedPreconditions: [
			"operation is scoped to intended paths",
			"ownership proof is present for every path",
		],
		requiredProvenanceChecks: [
			"manifest hash, provenance record, same-run agent provenance, or explicit user approval",
		],
		blockerBehavior:
			"block delete/move operations on ambiguous or user-owned paths",
		auditOutput: ["class", "paths", "ownership proof", "required next action"],
		requiresOwnershipProof: true,
		blocksWhenAmbiguous: true,
		writesWorkspace: true,
	},
	"revert-like": {
		className: "revert-like",
		allowedPreconditions: [
			"revert target is agent-owned or manifest-owned",
			"hash/provenance proves the pre-change state",
		],
		requiredProvenanceChecks: [
			"manifest hash, provenance record, same-run agent provenance, or explicit user approval",
		],
		blockerBehavior:
			"block restore/reset/checkout/clean operations until ownership is proven",
		auditOutput: ["class", "paths", "ownership proof", "revert authority"],
		requiresOwnershipProof: true,
		blocksWhenAmbiguous: true,
		writesWorkspace: true,
	},
	staging: {
		className: "staging",
		allowedPreconditions: [
			"staged paths are exactly intended paths",
			"unintended diff is absent",
			"ownership proof exists for each staged path",
		],
		requiredProvenanceChecks: [
			"manifest/provenance proof or explicit user approval",
		],
		blockerBehavior: "block staging of ambiguous or unintended files",
		auditOutput: ["class", "paths", "intended diff", "ownership proof"],
		requiresOwnershipProof: true,
		blocksWhenAmbiguous: true,
		writesWorkspace: true,
	},
	commit: {
		className: "commit",
		allowedPreconditions: [
			"staged diff contains only intended owned paths",
			"verification has run and passed or blocker is reported",
		],
		requiredProvenanceChecks: [
			"staged path ownership proof",
			"verification records",
		],
		blockerBehavior:
			"block commit when ownership or verification evidence is missing",
		auditOutput: ["class", "staged paths", "verification", "ownership proof"],
		requiresOwnershipProof: true,
		blocksWhenAmbiguous: true,
		writesWorkspace: true,
	},
	"generated-artifact": {
		className: "generated-artifact",
		allowedPreconditions: [
			"artifact path is manifest-owned or agent-created in the same run",
			"write plan includes expected hash/provenance",
		],
		requiredProvenanceChecks: ["manifest ownership or same-run provenance"],
		blockerBehavior: "block generated-looking writes without ownership proof",
		auditOutput: ["class", "artifact path", "manifest ownership", "provenance"],
		requiresOwnershipProof: true,
		blocksWhenAmbiguous: true,
		writesWorkspace: true,
	},
	unknown: {
		className: "unknown",
		allowedPreconditions: ["no workspace mutation detected"],
		requiredProvenanceChecks: [
			"none unless another policy classifies mutation",
		],
		blockerBehavior: "defer to other Themis policies",
		auditOutput: ["class", "subject"],
		requiresOwnershipProof: false,
		blocksWhenAmbiguous: false,
		writesWorkspace: false,
	},
};

export function workspaceOwnershipReasons(event: PolicyEvent): string[] {
	if (event.eventType !== "tool_call") return [];
	const workspace = event.workspace;
	const classified = classifyPolicyEventCommand(event);
	const operation = workspace?.operation ?? classified.operation;
	const paths = workspace?.paths ?? event.paths ?? pathList(event.path);
	const proof =
		workspace?.proof ?? (event.manifestOwned ? "manifest-hash" : "unknown");
	const ambiguous =
		workspace?.ambiguous ?? (proof === "unknown" && paths.length > 0);
	const userOwned = workspace?.userOwned === true;
	const reasons: string[] = [];

	if (classified.reasons.length > 0) reasons.push(...classified.reasons);
	if (operation === null) return reasons;
	if (
		!(sensitiveOperation(operation) || classified.policy.requiresOwnershipProof)
	)
		return reasons;

	if (!hasOwnershipProof(proof)) {
		reasons.push(
			`${operation} requires manifest hash, provenance record, same-run agent provenance, or explicit user approval`,
		);
	}
	if (ambiguous) {
		reasons.push(
			`${operation} denied for ambiguous workspace paths; unexplained changes are user-owned`,
		);
	}
	if (userOwned) {
		reasons.push(`${operation} denied for user-owned workspace paths`);
	}
	if (
		operation === "format" &&
		paths.length === 0 &&
		!hasOwnershipProof(proof)
	) {
		reasons.push(
			"broad formatter requires scoped paths with ownership proof or explicit approval",
		);
	}
	return [...new Set(reasons)].sort();
}

export function classifyPolicyEventCommand(
	event: PolicyEvent,
): WorkspaceCommandClassification {
	const commandClassification = classifyWorkspaceCommand(
		event.command,
		event.argv,
	);
	const eventPaths = event.paths ?? pathList(event.path);
	const paths =
		commandClassification.paths.length > 0
			? commandClassification.paths
			: eventPaths;
	const eventWorkspaceWrite =
		event.operation === "write" || event.operation === "edit";
	if (
		event.generatedArtifact !== true &&
		event.workspace?.generated !== true &&
		!eventWorkspaceWrite
	) {
		return commandClassification;
	}
	return buildClassification({
		classes: uniqueClasses([
			...commandClassification.classes,
			...(eventWorkspaceWrite ? ["formatting-write" as const] : []),
			...(event.generatedArtifact === true ||
			event.workspace?.generated === true
				? ["generated-artifact" as const]
				: []),
		]),
		operation:
			commandClassification.operation ??
			(event.operation === "write" ? "write" : "edit"),
		paths,
		reasons: [
			...commandClassification.reasons,
			...(eventWorkspaceWrite
				? ["workspace write operation classified for ownership policy"]
				: []),
			...(event.generatedArtifact === true ||
			event.workspace?.generated === true
				? [
						"generated artifact operation classified for manifest/provenance policy",
					]
				: []),
		],
	});
}

export function classifyWorkspaceCommand(
	command: string | undefined,
	argv: string[] = [],
): WorkspaceCommandClassification {
	const tokens = tokenizeCommand(command, argv);
	const reasons: string[] = [];
	let operation: WorkspaceOperation | null = null;
	const classes: AgentCommandClass[] = [];

	if (tokens[0] === "git") {
		const gitSubcommand = tokens[1];
		if (gitSubcommand !== undefined && REVISION_COMMANDS.has(gitSubcommand)) {
			operation = gitSubcommand === "clean" ? "delete" : "revert";
			classes.push(
				gitSubcommand === "clean" ? "destructive-workspace" : "revert-like",
			);
			reasons.push(`git ${gitSubcommand} is a revert-like workspace operation`);
		}
		if (gitSubcommand === "add") {
			operation = "stage";
			classes.push("staging");
			reasons.push(
				"git add stages workspace changes and requires ownership proof",
			);
		}
		if (gitSubcommand === "commit") {
			operation = "commit";
			classes.push("commit");
			reasons.push("git commit requires staged-change ownership proof");
		}
		if (
			gitSubcommand !== undefined &&
			READ_ONLY_GIT_COMMANDS.has(gitSubcommand) &&
			classes.length === 0
		) {
			classes.push("read-only-inspection");
		}
	}

	if (tokens.includes("rm")) {
		operation = "delete";
		classes.push("destructive-workspace");
		reasons.push("rm deletes workspace paths and requires ownership proof");
	}
	if (tokens.includes("mv")) {
		operation = "move";
		classes.push("destructive-workspace");
		reasons.push("mv moves workspace paths and requires ownership proof");
	}
	if (isFormatterCommand(tokens)) {
		operation = "format";
		classes.push("formatting-write");
		reasons.push("formatter write command can rewrite unrelated files");
	}
	if (classes.length === 0 && READ_ONLY_SHELL_COMMANDS.has(tokens[0] ?? "")) {
		classes.push("read-only-inspection");
	}

	return buildClassification({
		classes: uniqueClasses(classes.length === 0 ? ["unknown"] : classes),
		operation,
		paths: extractPathTokens(tokens),
		reasons,
	});
}

export function commandClassPolicy(
	className: AgentCommandClass,
): CommandClassPolicy {
	return COMMAND_CLASS_POLICIES[className];
}

export function hasOwnershipProof(proof: OwnershipProof | undefined): boolean {
	return (
		proof !== undefined && proof !== "unknown" && OWNERSHIP_PROOFS.has(proof)
	);
}

function sensitiveOperation(operation: WorkspaceOperation): boolean {
	return [
		"edit",
		"write",
		"revert",
		"delete",
		"move",
		"format",
		"stage",
		"commit",
	].includes(operation);
}

function tokenizeCommand(
	command: string | undefined,
	argv: string[],
): string[] {
	const raw = [command ?? "", ...argv].join(" ").trim();
	if (raw.length === 0) return [];
	return raw
		.split(TOKEN_SPLIT_PATTERN)
		.map((token) => token.replace(TOKEN_QUOTE_TRIM_PATTERN, ""))
		.filter((token) => token.length > 0);
}

function isFormatterCommand(tokens: string[]): boolean {
	return tokens.some((token, index) => {
		if (PACKAGE_FORMAT_SCRIPT_PATTERN.test(token)) {
			return true;
		}
		if (
			tokens.includes("biome") &&
			tokens.some((entry) => FIX_FLAGS.has(entry))
		) {
			return true;
		}
		if (
			FORMAT_COMMANDS.has(token) &&
			tokens.some((entry) => FIX_FLAGS.has(entry))
		) {
			return true;
		}
		if (token === "biome" && tokens[index + 1] === "format") return true;
		if (token === "prettier" && tokens.some((entry) => FIX_FLAGS.has(entry))) {
			return true;
		}
		if (token === "eslint" && tokens.includes("--fix")) return true;
		return false;
	});
}

function extractPathTokens(tokens: string[]): string[] {
	return tokens.filter(
		(token) =>
			!token.startsWith("-") &&
			(token.startsWith(".") || token.startsWith("/") || token.includes("/")),
	);
}

function pathList(path: string | undefined): string[] {
	return path === undefined ? [] : [path];
}

function buildClassification(options: {
	classes: AgentCommandClass[];
	operation: WorkspaceOperation | null;
	paths: string[];
	reasons: string[];
}): WorkspaceCommandClassification {
	const primaryClass = primaryClassFor(options.classes);
	const policy = COMMAND_CLASS_POLICIES[primaryClass];
	const requiresOwnershipProof = options.classes.some(
		(className) => COMMAND_CLASS_POLICIES[className].requiresOwnershipProof,
	);
	const blocksWhenAmbiguous = options.classes.some(
		(className) => COMMAND_CLASS_POLICIES[className].blocksWhenAmbiguous,
	);
	const writesWorkspace = options.classes.some(
		(className) => COMMAND_CLASS_POLICIES[className].writesWorkspace,
	);
	const audit = {
		primaryClass,
		classes: options.classes,
		operation: options.operation,
		paths: options.paths,
		requiresOwnershipProof,
		blocksWhenAmbiguous,
		writesWorkspace,
		allowedPreconditions: policy.allowedPreconditions,
		requiredProvenanceChecks: policy.requiredProvenanceChecks,
		blockerBehavior: policy.blockerBehavior,
		auditOutput: policy.auditOutput,
	} satisfies CommandClassificationAudit;
	return {
		primaryClass,
		classes: options.classes,
		operation: options.operation,
		reasons: [...new Set(options.reasons)].sort(),
		paths: options.paths,
		requiresOwnershipProof,
		blocksWhenAmbiguous,
		writesWorkspace,
		policy,
		audit,
	};
}

function uniqueClasses(classes: AgentCommandClass[]): AgentCommandClass[] {
	return [...new Set(classes)].sort((left, right) => left.localeCompare(right));
}

function primaryClassFor(classes: AgentCommandClass[]): AgentCommandClass {
	for (const className of [
		"commit",
		"staging",
		"revert-like",
		"destructive-workspace",
		"formatting-write",
		"generated-artifact",
		"read-only-inspection",
	] satisfies AgentCommandClass[]) {
		if (classes.includes(className)) return className;
	}
	return "unknown";
}
