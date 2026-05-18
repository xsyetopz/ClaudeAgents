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

export interface OlympusCatalog {
	schemaVersion: 1;
	product: "Olympus";
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
		command: "inspect",
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
		command: "install",
		purpose:
			"Mirror approved passive Pi resources into a project-local Olympus package.",
		mutationPolicy: "dry-run-first-project-local",
		writes: [
			".pi/settings.json packages entry",
			".pi/olympus/olympus-manifest.json",
			".pi/olympus/audit.jsonl",
			".pi/olympus/packages/<package-id>/package/**",
		],
		blocked: [
			"~/.pi writes",
			"executable resources",
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
			".pi/olympus/olympus-manifest.json",
			".pi/olympus/audit.jsonl",
		],
		blocked: [
			"path-name ownership inference",
			"hash-mismatched file deletion",
			"global removals",
		],
	},
	{
		command: "extension create",
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
		command: "status",
		purpose:
			"Read project-local Olympus manifest, lock, audit, and settings state for handoff.",
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
		purpose:
			"Emit a compact, actionable handoff report for LLM and human continuation.",
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
		command: "compact",
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
		command: "rtk status",
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
		command: "quota status",
		purpose:
			"Read project-local quota profile labels and report uncertain usage estimates without fabricated provider limits.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["opaque provider limit fabrication", "global Pi state writes"],
	},
	{
		command: "safety check",
		purpose:
			"Run deterministic Olympus safety policy fixtures for unsafe tools, redaction, provider payload, and quota-pressure warnings.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"third-party execution",
			"raw credential logging",
			"global Pi state writes",
		],
	},
	{
		command: "hooks policy",
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
		command: "sandbox check",
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
		command: "broker validate",
		purpose:
			"Validate typed read-only git, gh, and registry broker requests and deny arbitrary shell strings.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["arbitrary shell", "credential use", "broker mutations"],
	},
	{
		command: "trust status",
		purpose:
			"Report trust/signage state including unsigned, locked, hash mismatch, executable blocked, sandbox, home, and network labels.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["implicit trust", "executable load", "trust mutation"],
	},
	{
		command: "resources validate",
		purpose:
			"Validate Olympus-owned skill, prompt, command, provenance, support-file, and collision metadata.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"global resource install",
			"third-party execution",
			"~/.pi writes",
		],
	},
	{
		command: "prompt contract",
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
		command: "review plan",
		purpose:
			"Review plan artifacts with digests, approval state, allowlists, annotations, and feedback.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["unapproved write continuation", "digest mismatch continuation"],
	},
	{
		command: "review diff",
		purpose:
			"Review diff artifacts with changed/deleted file annotations and deterministic diff digest.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: ["decision alteration", "secret persistence"],
	},
	{
		command: "handoff current",
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
		command: "module status",
		purpose:
			"Report bounded Olympus module shells and non-goals for Athena, Themis, Apollo, Hermes, Hestia, Aegis, Moirai, and Hephaestus.",
		mutationPolicy: "read-only",
		writes: [],
		blocked: [
			"roleplay personas",
			"swarm execution",
			"write authority by prompt",
		],
	},
	{
		command: "catalog",
		purpose:
			"Emit the Olympus source-of-truth contracts for humans and LLM sessions.",
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
			"LLM-readable product contracts stay aligned with implemented command boundaries",
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
	"Mutating project commands plan before apply and write only project-local Olympus-owned paths.",
	"Global ~/.pi writes are outside the default Olympus safety boundary.",
	"Uninstall authority comes from the Olympus manifest, not path names.",
	"Hash mismatches preserve user-modified files for manual review.",
	"LLM-readable status and catalog output is generated from Olympus-owned contracts, not legacy names.",
	"RTK availability is explicit for output-heavy workflows; fallback compaction records degraded reasons.",
	"Quota reports label unknown quota as unknown and do not fabricate opaque provider limits.",
	"Safety policy fails closed for dangerous commands, protected paths, executable package loads, unapproved generated writes, and unsafe global Pi paths.",
	"Broker APIs validate typed read-only requests and deny arbitrary shell strings.",
	"Olympus module names are bounded codenames, not personas, and do not grant write authority by prompt instruction.",
	"Hephaestus remains blocked unless approved plan digest, path allowlist, manifest ownership, and Themis approval are proven.",
];

export function getOlympusCatalog(): OlympusCatalog {
	return {
		schemaVersion: 1,
		product: "Olympus",
		contract:
			"PiCodingAgent-first harness for safe local agent augmentation through inspect, evaluate, manifest-owned install, verify, and uninstall.",
		sourceOfTruth: [
			"packages/olympus/src/catalog.ts",
			"packages/olympus/src/inspection.ts",
			"packages/olympus/src/evaluation.ts",
			"packages/olympus/src/install-flow.ts",
			"packages/olympus/src/commands/verify.ts",
			"packages/olympus/src/reports/status.ts",
			"packages/olympus/src/compaction/index.ts",
			"packages/olympus/src/quota/profile.ts",
			"packages/olympus/src/policy/themis.ts",
			"packages/olympus/src/sandbox/probe.ts",
			"packages/olympus/src/broker/read-only.ts",
			"packages/olympus/src/trust/status.ts",
			"packages/olympus/src/resources/validate.ts",
			"packages/olympus/src/workflow/prompt-contract.ts",
			"packages/olympus/src/workflow/review.ts",
			"packages/olympus/src/modules/contracts.ts",
		],
		resources: RESOURCE_CONTRACTS,
		commands: COMMAND_CONTRACTS,
		acceptance: ACCEPTANCE_CONTRACTS,
		safetyInvariants: SAFETY_INVARIANTS,
	};
}

export function validateOlympusCatalog(
	catalog: OlympusCatalog = getOlympusCatalog(),
): string[] {
	const errors: string[] = [];
	const commandNames = new Set(
		catalog.commands.map((command) => command.command),
	);
	for (const required of [
		"inspect",
		"package evaluate",
		"install",
		"uninstall",
		"verify",
		"status",
		"report status",
		"report handoff",
		"report acceptance",
		"compact",
		"rtk status",
		"quota status",
		"safety check",
		"hooks policy",
		"sandbox check",
		"broker validate",
		"trust status",
		"resources validate",
		"prompt contract",
		"review plan",
		"review diff",
		"handoff current",
		"module status",
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

export function formatOlympusCatalog(catalog: OlympusCatalog): string {
	const lines = [
		"# Olympus Source-of-Truth Catalog",
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
		lines.push(`- olympus ${command.command}: ${command.purpose}`);
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
