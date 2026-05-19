import type {
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

export interface WorkspaceCommandClassification {
	operation: WorkspaceOperation | null;
	reasons: string[];
	paths: string[];
	requiresOwnershipProof: boolean;
}

export function workspaceOwnershipReasons(event: PolicyEvent): string[] {
	if (event.eventType !== "tool_call") return [];
	const workspace = event.workspace;
	const classified = classifyWorkspaceCommand(event.command, event.argv);
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
	if (!sensitiveOperation(operation)) return reasons;

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

export function classifyWorkspaceCommand(
	command: string | undefined,
	argv: string[] = [],
): WorkspaceCommandClassification {
	const tokens = tokenizeCommand(command, argv);
	const reasons: string[] = [];
	let operation: WorkspaceOperation | null = null;
	let requiresOwnershipProof = false;

	if (tokens[0] === "git") {
		const gitSubcommand = tokens[1];
		if (gitSubcommand !== undefined && REVISION_COMMANDS.has(gitSubcommand)) {
			operation = gitSubcommand === "clean" ? "delete" : "revert";
			requiresOwnershipProof = true;
			reasons.push(`git ${gitSubcommand} is a revert-like workspace operation`);
		}
		if (gitSubcommand === "add") {
			operation = "stage";
			requiresOwnershipProof = true;
			reasons.push(
				"git add stages workspace changes and requires ownership proof",
			);
		}
		if (gitSubcommand === "commit") {
			operation = "commit";
			requiresOwnershipProof = true;
			reasons.push("git commit requires staged-change ownership proof");
		}
	}

	if (tokens.includes("rm")) {
		operation = "delete";
		requiresOwnershipProof = true;
		reasons.push("rm deletes workspace paths and requires ownership proof");
	}
	if (tokens.includes("mv")) {
		operation = "move";
		requiresOwnershipProof = true;
		reasons.push("mv moves workspace paths and requires ownership proof");
	}
	if (isFormatterCommand(tokens)) {
		operation = "format";
		requiresOwnershipProof = true;
		reasons.push("formatter write command can rewrite unrelated files");
	}

	return {
		operation,
		reasons: [...new Set(reasons)].sort(),
		paths: extractPathTokens(tokens),
		requiresOwnershipProof,
	};
}

export function hasOwnershipProof(proof: OwnershipProof | undefined): boolean {
	return (
		proof !== undefined && proof !== "unknown" && OWNERSHIP_PROOFS.has(proof)
	);
}

function sensitiveOperation(operation: WorkspaceOperation): boolean {
	return ["revert", "delete", "move", "format", "stage", "commit"].includes(
		operation,
	);
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
