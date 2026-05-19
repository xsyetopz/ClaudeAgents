export type CatalogMutationPolicy =
	| "read-only"
	| "dry-run-first-project-local"
	| "explicit-output-only"
	| "temp-roots-only";

export interface CatalogResourceContract {
	kind: "skill" | "prompt" | "theme" | "extension";
	classification: "passive-untrusted" | "passive-static" | "executable";
	discovery: string[];
	initialPolicy: string;
}

export interface CatalogCommandContract {
	command: string;
	purpose: string;
	mutationPolicy: CatalogMutationPolicy;
	writes: string[];
	blocked: string[];
}

export interface CatalogAcceptanceContract {
	name: string;
	proves: string;
	fixtureScope: "temp-project" | "fake-home" | "read-only";
}

export interface OlympiCatalog {
	schemaVersion: 1;
	product: "Olympi";
	contract: string;
	sourceOfTruth: string[];
	resources: CatalogResourceContract[];
	commands: CatalogCommandContract[];
	acceptance: CatalogAcceptanceContract[];
	safetyInvariants: string[];
}

const RESOURCE_CONTRACTS: CatalogResourceContract[] = [
	{
		kind: "skill",
		classification: "passive-untrusted",
		discovery: ["package.json pi.skills", "skills/**/SKILL.md"],
		initialPolicy:
			"inspect, hash, mirror only through manifest-owned package entries",
	},
	{
		kind: "prompt",
		classification: "passive-untrusted",
		discovery: ["package.json pi.prompts", "prompts/*.md"],
		initialPolicy:
			"inspect, hash, mirror only through manifest-owned package entries",
	},
	{
		kind: "theme",
		classification: "passive-static",
		discovery: ["package.json pi.themes", "themes/*.json"],
		initialPolicy:
			"inspect, parse JSON when possible, mirror through manifest ownership",
	},
	{
		kind: "extension",
		classification: "executable",
		discovery: [
			"package.json pi.extensions",
			"extensions/*.ts",
			"extensions/*/index.ts",
		],
		initialPolicy:
			"inspect and hash only until explicit trust and sandbox gates exist",
	},
];

const COMMAND_CONTRACTS: CatalogCommandContract[] = [
	{
		command: "package inspect",
		purpose:
			"Read local package metadata and resources without executing package code.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["package-manager invocation", "lifecycle script execution"],
	},
	{
		command: "package evaluate",
		purpose:
			"Classify local package risk, conflicts, and installability before trust.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["trust writes", "package code execution", "global installs"],
	},
	{
		command: "report package-risk",
		purpose:
			"Emit deterministic package risk, conflict, warning, and recommendation details for CLI and interactive parity.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["package code execution", "trust writes", "global installs"],
	},
	{
		command: "install",
		purpose:
			"Mirror approved passive resources, or stage trusted executable resources without enabling load until trust/load gates pass.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [
			".pi/settings.json packages entry",
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/olympi.lock for executable stage",
			".pi/olympi/audit.jsonl",
			".pi/olympi/packages/<package-id>/package/**",
		],
		blocked: [
			"~/.pi writes",
			"executable settings load during stage",
			"executable stage without matching signature digest",
			"direct .pi/skills writes",
			"direct .pi/prompts writes",
		],
	},
	{
		command: "uninstall",
		purpose:
			"Remove only manifest-owned files and settings entries with matching hashes.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [
			".pi/settings.json",
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/audit.jsonl",
		],
		blocked: [
			"path-name ownership inference",
			"hash-mismatched file deletion",
			"global removals",
		],
	},
	{
		command: "debug extension create",
		purpose:
			"Generate first-party Pi extension skeletons with explicit capability metadata.",
		mutationPolicy: "explicit-output-only",
		writes: ["caller-provided output directory only"],
		blocked: [
			"default project .pi extension writes before manifest support",
			"third-party execution",
		],
	},
	{
		command: "verify",
		purpose:
			"Run deterministic fixture acceptance checks in temp roots and fake homes.",
		mutationPolicy: "temp-roots-only",
		writes: ["temporary project roots", "temporary fake homes"],
		blocked: [
			"real home secrets",
			"global Pi state",
			"network-dependent checks",
		],
	},
	{
		command: "setup status",
		purpose:
			"Detect Bun, Pi, RTK, and project-local Olympi state without mutating setup or global homes.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"package-manager execution",
			"global executable install",
			"~/.pi writes",
		],
	},
	{
		command: "status",
		purpose:
			"Read project-local Olympi manifest, lock, audit, and settings state for handoff.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["state repair", "implicit trust", "manifest mutation"],
	},
	{
		command: "report status",
		purpose:
			"Emit deterministic project-local status with RTK, quota, report paths, and drift summaries.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"implicit repair",
			"global Pi state writes",
			"secret persistence",
		],
	},
	{
		command: "report handoff",
		purpose: "Emit a compact handoff report for continuation.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["handoff file write by default", "secret persistence"],
	},
	{
		command: "report acceptance",
		purpose:
			"Aggregate deterministic acceptance evidence for catalog, RTK status, and quota labeling.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["network-dependent checks", "global Pi state writes"],
	},
	{
		command: "report write",
		purpose:
			"Explicitly write status, handoff, and acceptance artifacts under project-local .pi/olympi paths only.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [
			".pi/olympi/reports/status.json",
			".pi/olympi/reports/acceptance.json",
			".pi/olympi/handoff/current.md",
		],
		blocked: ["implicit writes", "~/.pi writes", "secret persistence"],
	},
	{
		command: "debug audit append",
		purpose:
			"Append explicit project-local Olympi audit events for handoff/report workflows.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [".pi/olympi/audit.jsonl"],
		blocked: ["implicit audit mutation", "~/.pi writes"],
	},
	{
		command: "debug context compact-advice",
		purpose:
			"Parse Pi statusline context and recommend the exact post-handoff `/compact` command when threshold is reached.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["executing Pi commands", "inventing context without statusline"],
	},
	{
		command: "debug compact",
		purpose:
			"Compact output-heavy fixture or file text with RTK-first status and explicit fallback reasons.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"secret-preserving summaries",
			"hidden failing tests",
			"hidden deleted files",
		],
	},
	{
		command: "debug rtk status",
		purpose:
			"Detect RTK on PATH and recommend RTK-backed paths for output-heavy workflows.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"silent RTK bypass",
			"third-party command execution during detection",
		],
	},
	{
		command: "debug rtk plan",
		purpose:
			"Classify output-heavy commands and emit RTK-preferred plus fallback command forms without executing either command.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["command execution", "silent RTK bypass"],
	},
	{
		command: "debug quota status",
		purpose:
			"Read project-local quota profile labels and report uncertain usage estimates without fabricated provider limits.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["opaque provider limit fabrication", "global Pi state writes"],
	},
	{
		command: "safety check",
		purpose:
			"Run deterministic Olympi safety policy fixtures for unsafe tools, redaction, provider payload, and quota-pressure warnings.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"third-party execution",
			"raw credential logging",
			"global Pi state writes",
		],
	},
	{
		command: "safety hooks policy",
		purpose:
			"Report the non-executing Aegis hook policy skeleton and subscribed Pi event surfaces.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"runtime third-party hook execution",
			"unsafe fail-open safety policy",
		],
	},
	{
		command: "safety hooks aegis-runtime",
		purpose:
			"Report the first-party Pi Aegis runtime extension entrypoint and fail-closed subscribed event contract.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"global ~/.pi extension writes",
			"third-party package code execution",
			"unsafe fail-open tool_call handling",
		],
	},
	{
		command: "safety hooks aegis-install",
		purpose:
			"Plan or explicitly write the first-party Aegis extension entrypoint to project-local .pi/extensions only.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [".pi/extensions/olympi-aegis.ts"],
		blocked: ["global ~/.pi extension writes", "third-party code execution"],
	},
	{
		command: "safety sandbox check",
		purpose:
			"Probe sandbox readiness and fake-home secret denial without untrusted package execution.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"executable load approval",
			"real home secret reads",
			"untrusted package execution",
		],
	},
	{
		command: "safety broker validate",
		purpose:
			"Validate typed read-only git, gh, and registry broker requests and deny arbitrary shell strings.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["arbitrary shell", "credential use", "broker mutations"],
	},
	{
		command: "safety trust status",
		purpose:
			"Report trust/signage state including unsigned, locked, hash mismatch, executable blocked, sandbox, home, and network labels.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["implicit trust", "executable load", "trust mutation"],
	},
	{
		command: "safety trust executable-proof",
		purpose:
			"Prove executable package gates from manifest, lock, signature-subject digest, sandbox readiness, and home/network denial signage without loading code.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"implicit executable trust",
			"untrusted code execution",
			"global trust mutation",
		],
	},
	{
		command: "safety trust executable-load",
		purpose:
			"Enable staged executable package loading in project-local Pi settings only after manifest, lock, signature, and sandbox proof pass.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [
			".pi/settings.json packages entry",
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/audit.jsonl",
		],
		blocked: [
			"failed executable proof",
			"untrusted code execution by Olympi CLI",
			"global trust mutation",
		],
	},
	{
		command: "debug resources validate",
		purpose:
			"Validate Olympi-owned skill, prompt, command, provenance, support-file, and collision metadata.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"global resource install",
			"third-party execution",
			"~/.pi writes",
		],
	},
	{
		command: "debug resources install",
		purpose:
			"Plan or explicitly install Olympi first-party resources into project-local Pi settings and Olympi-owned manifest paths.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [
			".pi/settings.json",
			".pi/olympi/first-party-resources/**",
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/olympi.lock",
			".pi/olympi/audit.jsonl",
		],
		blocked: [
			"global resource install",
			"third-party execution",
			"~/.pi writes",
		],
	},
	{
		command: "debug prompt contract",
		purpose:
			"Emit a deterministic prompt-contract artifact preserving goal, paths, constraints, risks, and stop conditions.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"prompt-only write authority",
			"dropping user constraints",
			"secret persistence",
		],
	},
	{
		command: "debug review plan",
		purpose:
			"Review plan artifacts with digests, approval state, allowlists, annotations, and feedback.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["unapproved write continuation", "digest mismatch continuation"],
	},
	{
		command: "debug review diff",
		purpose:
			"Review diff artifacts with changed/deleted file annotations and deterministic diff digest.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["decision alteration", "secret persistence"],
	},
	{
		command: "debug handoff current",
		purpose:
			"Emit compact Hermes handoff summaries without changing decisions or mutating source.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"decision alteration",
			"project source mutation",
			"secret persistence",
		],
	},
	{
		command: "debug module status",
		purpose:
			"Report bounded Olympi module shells and non-goals for Athena, Themis, Apollo, Hermes, Hestia, Aegis, Moirai, and Hephaestus.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"roleplay personas",
			"swarm execution",
			"write authority by prompt",
		],
	},
	{
		command: "debug module hephaestus proof",
		purpose:
			"Prove Hephaestus apply-gate prerequisites: approved digest, path allowlist, manifest ownership, and Themis approval; no writes are executed.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"digest mismatch apply",
			"path outside allowlist",
			"apply execution by proof command",
		],
	},
	{
		command: "debug module hephaestus apply",
		purpose:
			"Apply write operations only from a proven Hephaestus plan with digest, allowlist, manifest ownership, Themis, and queue gates passing.",
		mutationPolicy: "dry-run-first-project-local",
		writes: ["approved plan operation paths", ".pi/olympi/audit.jsonl"],
		blocked: [
			"unproven plan digest",
			"path outside allowlist",
			"missing manifest ownership",
			"unsafe queue collision",
		],
	},
	{
		command: "debug profile status",
		purpose:
			"Read the optional Olympi-owned project-local profile without legacy provider-renderer semantics.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["provider-renderer profiles", "global Pi profile writes"],
	},
	{
		command: "debug profile set",
		purpose:
			"Plan or explicitly write a bounded project-local Olympi profile distinct from legacy provider profiles.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [".pi/olympi/profile.json"],
		blocked: ["provider-renderer compatibility", "global Pi profile writes"],
	},
	{
		command: "debug lock queue",
		purpose:
			"Build a deterministic file-level mutation queue plan before future parallel writes touch manifest, lock, settings, audit, or source files.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["parallel write execution", "unqueued manifest mutation"],
	},
	{
		command: "catalog",
		purpose: "Emit implemented command and safety contracts.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["old command aliases", "legacy renderer assumptions"],
	},
];

const ACCEPTANCE_CONTRACTS: CatalogAcceptanceContract[] = [
	{
		name: "passive-resource-inspection",
		proves:
			"resource discovery and passive/executable classification are deterministic",
		fixtureScope: "read-only",
	},
	{
		name: "passive-mirror-install",
		proves:
			"install writes only manifest-owned project-local mirror/settings/audit paths",
		fixtureScope: "temp-project",
	},
	{
		name: "manifest-backed-uninstall",
		proves:
			"uninstall removes only manifest-owned matching hashes and preserves user changes",
		fixtureScope: "temp-project",
	},
	{
		name: "no-global-write",
		proves: "fixture runs do not touch fake home secrets or global Pi state",
		fixtureScope: "fake-home",
	},
	{
		name: "catalog-contract",
		proves:
			"catalog contracts stay aligned with implemented command boundaries",
		fixtureScope: "read-only",
	},
	{
		name: "reporting-efficiency",
		proves:
			"RTK status, fallback compaction, handoff, acceptance, and quota reports are deterministic",
		fixtureScope: "read-only",
	},
	{
		name: "safety-runtime-policy",
		proves:
			"Themis decisions, Aegis skeleton, sandbox probes, trust signage, and broker schemas are fail-closed and read-only",
		fixtureScope: "fake-home",
	},
	{
		name: "authoring-workflow",
		proves:
			"Resource metadata, prompt contracts, review artifacts, handoff, and module shells are deterministic and bounded",
		fixtureScope: "read-only",
	},
];

const SAFETY_INVARIANTS = [
	"Local package inspection never executes package code or lifecycle scripts.",
	"Executable resources are inspected and hashed, not installed as trusted code by default.",
	"Mutating project commands plan before apply and write only project-local Olympi-owned paths.",
	"Global ~/.pi writes are outside the default Olympi safety boundary.",
	"Uninstall authority comes from the Olympi manifest, not path names.",
	"Hash mismatches preserve user-modified files for manual review.",
	"Status and catalog output is generated from active contracts, not legacy names.",
	"RTK availability is explicit for output-heavy workflows; fallback compaction records degraded reasons.",
	"RTK command planning is advisory and does not execute RTK or shell commands.",
	"Quota reports label unknown quota as unknown and do not fabricate opaque provider limits.",
	"Safety policy fails closed for dangerous commands, protected paths, executable package loads, unapproved generated writes, and unsafe global Pi paths.",
	"Broker APIs validate typed read-only requests and deny arbitrary shell strings.",
	"Olympi module names are bounded codenames, not personas, and do not grant write authority by prompt instruction.",
	"Hephaestus remains blocked unless approved plan digest, path allowlist, manifest ownership, and Themis approval are proven.",
	"Project-local profiles are Olympi UX hints only and never restore legacy provider-renderer profiles.",
	"File-level mutation queue plans are deterministic prerequisites before future parallel writes.",
];

export function getOlympiCatalog(): OlympiCatalog {
	return {
		schemaVersion: 1,
		product: "Olympi",
		contract:
			"Local Pi package inspection, risk evaluation, project-local install, verification, and manifest-backed uninstall.",
		sourceOfTruth: [
			"packages/reporting/src/catalog.ts",
			"packages/lifecycle/src/inspection.ts",
			"packages/lifecycle/src/evaluation.ts",
			"packages/lifecycle/src/install-flow.ts",
			"packages/cli/src/commands/verify.ts",
			"packages/reporting/src/reports/status.ts",
			"packages/reporting/src/artifacts.ts",
			"packages/reporting/src/context.ts",
			"packages/reporting/src/reports/package-risk.ts",
			"packages/cli/src/setup-status.ts",
			"packages/reporting/src/compaction/index.ts",
			"packages/reporting/src/compaction/rtk.ts",
			"packages/safety/src/quota/profile.ts",
			"packages/lifecycle/src/profile.ts",
			"packages/safety/src/policy/themis.ts",
			"packages/safety/src/sandbox/probe.ts",
			"packages/safety/src/broker/read-only.ts",
			"packages/trust/src/trust/status.ts",
			"packages/authoring/src/resources/validate.ts",
			"packages/authoring/src/resources/first-party.ts",
			"packages/authoring/src/workflow/prompt-contract.ts",
			"packages/authoring/src/workflow/review.ts",
			"packages/authoring/src/workflow/mutation-queue.ts",
			"packages/authoring/src/modules/contracts.ts",
		],
		resources: RESOURCE_CONTRACTS,
		commands: COMMAND_CONTRACTS,
		acceptance: ACCEPTANCE_CONTRACTS,
		safetyInvariants: SAFETY_INVARIANTS,
	};
}

export function validateOlympiCatalog(
	catalog: OlympiCatalog = getOlympiCatalog(),
): string[] {
	const errors: string[] = [];
	const commandNames = new Set(
		catalog.commands.map((command) => command.command),
	);
	for (const required of [
		"package inspect",
		"package evaluate",
		"report package-risk",
		"install",
		"uninstall",
		"verify",
		"setup status",
		"status",
		"report status",
		"report handoff",
		"report acceptance",
		"report write",
		"debug audit append",
		"debug context compact-advice",
		"debug compact",
		"debug rtk status",
		"debug rtk plan",
		"debug quota status",
		"safety check",
		"safety hooks policy",
		"safety hooks aegis-runtime",
		"safety hooks aegis-install",
		"safety sandbox check",
		"safety broker validate",
		"safety trust status",
		"safety trust executable-proof",
		"safety trust executable-load",
		"debug resources validate",
		"debug resources install",
		"debug prompt contract",
		"debug review plan",
		"debug review diff",
		"debug handoff current",
		"debug module status",
		"debug module hephaestus proof",
		"debug module hephaestus apply",
		"debug profile status",
		"debug profile set",
		"debug lock queue",
		"catalog",
	]) {
		if (!commandNames.has(required))
			errors.push(`missing command contract: ${required}`);
	}
	const install = catalog.commands.find(
		(command) => command.command === "install",
	);
	if (install?.mutationPolicy !== "dry-run-first-project-local") {
		errors.push("install must remain dry-run-first and project-local");
	}
	if (!install?.blocked.includes("~/.pi writes")) {
		errors.push("install contract must block global Pi writes");
	}
	const uninstall = catalog.commands.find(
		(command) => command.command === "uninstall",
	);
	if (!uninstall?.blocked.includes("hash-mismatched file deletion")) {
		errors.push("uninstall contract must preserve hash mismatches");
	}
	const serialized = JSON.stringify(catalog).toLowerCase();
	for (const legacyTerm of ["openagentlayer", "active oal", "oal vnext"]) {
		if (serialized.includes(legacyTerm))
			errors.push(`legacy framing leaked into catalog: ${legacyTerm}`);
	}
	return errors;
}

export function formatOlympiCatalog(catalog: OlympiCatalog): string {
	const lines = [
		"# Olympi Catalog",
		"",
		catalog.contract,
		"",
		"## Source of truth",
	];
	for (const source of catalog.sourceOfTruth) lines.push(`- ${source}`);
	lines.push("", "## Resource contracts");
	for (const resource of catalog.resources) {
		lines.push(
			`- ${resource.kind}: ${resource.classification}; discovery=${resource.discovery.join(", ")}; policy=${resource.initialPolicy}`,
		);
	}
	lines.push("", "## Command contracts");
	for (const command of catalog.commands) {
		lines.push(`- olympi ${command.command}: ${command.purpose}`);
		lines.push(`  - mutation: ${command.mutationPolicy}`);
		lines.push(
			`  - writes: ${command.writes.length === 0 ? "none" : command.writes.join(", ")}`,
		);
		lines.push(`  - blocked: ${command.blocked.join(", ")}`);
	}
	lines.push("", "## Acceptance contracts");
	for (const acceptance of catalog.acceptance) {
		lines.push(
			`- ${acceptance.name}: ${acceptance.proves} (${acceptance.fixtureScope})`,
		);
	}
	lines.push("", "## Safety invariants");
	for (const invariant of catalog.safetyInvariants)
		lines.push(`- ${invariant}`);
	return `${lines.join("\n")}\n`;
}
