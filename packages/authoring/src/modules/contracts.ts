import { deterministicDigest, sortStrings } from "reporting";
import { decidePolicy } from "safety";

export type OlympiModuleName =
	| "athena"
	| "themis"
	| "apollo"
	| "hermes"
	| "hestia"
	| "aegis"
	| "moirai"
	| "hephaestus";
export type ModuleAuthority =
	| "read-only"
	| "decision-only"
	| "verify-only"
	| "summary-only"
	| "state-only"
	| "ordering-only"
	| "blocked-write-gate";

export interface OlympiModuleContract {
	name: OlympiModuleName;
	description: string;
	authority: ModuleAuthority;
	canWriteProjectSource: boolean;
	commands: string[];
	nonGoals: string[];
}

export interface ModuleStatusReport {
	schemaVersion: 1;
	command: "module status";
	modules: OlympiModuleContract[];
	warnings: string[];
}

export interface ModuleRunReport {
	schemaVersion: 1;
	command: "module run";
	module: OlympiModuleName;
	dryRun: boolean;
	decision: "allowed-dry-run" | "blocked";
	reasons: string[];
	dependencyGraph: Array<{ before: string; after: string }>;
	digest: string;
}

export const MODULE_CONTRACTS: OlympiModuleContract[] = [
	contract("athena", "planning and architecture review", "read-only", [
		"review plan",
	]),
	contract("themis", "policy and approval gates", "decision-only", [
		"safety check",
	]),
	contract("apollo", "verification and diagnostics", "verify-only", [
		"verify",
		"biome",
		"typecheck",
	]),
	contract("hermes", "handoff routing and compact summaries", "summary-only", [
		"handoff current",
	]),
	contract("hestia", "Olympi-owned state and continuity", "state-only", [
		"audit .pi/olympi only",
	]),
	contract("aegis", "runtime safety policy skeleton", "decision-only", [
		"hooks policy",
	]),
	contract("moirai", "dependency ordering graph only", "ordering-only", [
		"module status",
	]),
	contract(
		"hephaestus",
		"blocked implementation/apply gate placeholder",
		"blocked-write-gate",
		[],
	),
];

export function moduleStatus(): ModuleStatusReport {
	return {
		schemaVersion: 1,
		command: "module status",
		modules: MODULE_CONTRACTS,
		warnings: [
			"No module gains write authority by prompt instruction.",
			"Hephaestus remains blocked until approved digest, path allowlist, manifest ownership, and Themis approval are proven.",
		],
	};
}

export function runModuleDry(
	moduleName: string,
	dryRun: boolean,
	options: Record<string, unknown> = {},
): ModuleRunReport {
	const module = parseModule(moduleName);
	const reasons: string[] = [];
	if (!dryRun) reasons.push("module run requires --dry-run in this phase");
	if (module === "athena" && options["write"] === true)
		reasons.push("Athena cannot write or apply plans");
	if (module === "themis") {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			command: String(options["command"] ?? "rm -rf ~/.pi"),
		});
		if (decision.blocked) reasons.push("Themis blocks unsafe action");
	}
	if (
		module === "apollo" &&
		!["verify", "typecheck", "biome", "test"].includes(
			String(options["verifyCommand"] ?? "verify"),
		)
	)
		reasons.push("Apollo rejects commands outside allowlist");
	if (
		module === "hestia" &&
		!String(options["path"] ?? ".pi/olympi/state.json").startsWith(".pi/olympi")
	)
		reasons.push("Hestia refuses writes outside .pi/olympi");
	if (module === "hephaestus") {
		if (
			typeof options["approvedDigest"] !== "string" ||
			typeof options["planDigest"] !== "string"
		)
			reasons.push("Hephaestus rejects missing plan digest");
		if (options["approvedDigest"] !== options["planDigest"])
			reasons.push("Hephaestus rejects changed plan digest");
		reasons.push(
			"Hephaestus apply remains blocked until safety gates are proven",
		);
	}
	const dependencyGraph = module === "moirai" ? dependencyGraphOnly() : [];
	const sortedReasons = sortStrings(reasons);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "module run" as const,
		module,
		dryRun,
		decision:
			sortedReasons.length === 0
				? ("allowed-dry-run" as const)
				: ("blocked" as const),
		reasons: sortedReasons,
		dependencyGraph,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

function contract(
	name: OlympiModuleName,
	description: string,
	authority: ModuleAuthority,
	commands: string[],
): OlympiModuleContract {
	return {
		name,
		description,
		authority,
		canWriteProjectSource: false,
		commands,
		nonGoals: [
			"roleplay persona",
			"uncontrolled swarm",
			"write authority by prompt instruction",
			"~/.pi writes",
		],
	};
}

function parseModule(value: string): OlympiModuleName {
	if (
		[
			"athena",
			"themis",
			"apollo",
			"hermes",
			"hestia",
			"aegis",
			"moirai",
			"hephaestus",
		].includes(value)
	)
		return value as OlympiModuleName;
	return "hephaestus";
}

function dependencyGraphOnly(): Array<{ before: string; after: string }> {
	return [
		{ before: "athena", after: "themis" },
		{ before: "themis", after: "moirai" },
		{ before: "moirai", after: "hephaestus" },
		{ before: "hephaestus", after: "apollo" },
		{ before: "apollo", after: "hermes" },
	];
}
