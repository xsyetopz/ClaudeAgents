export type OlympusResourceKind = "skill" | "prompt" | "command";

export interface OlympusSupportFileMetadata {
	path: string;
	hash?: string;
}

export interface OlympusResourceMetadata {
	schemaVersion: 1;
	name: string;
	description: string;
	resourceKind: OlympusResourceKind;
	olympusOwned: true;
	provenance: "first-party" | "project-local";
	supportFiles: OlympusSupportFileMetadata[];
	commands: string[];
	nonGoals: string[];
	verification: string;
}

export interface ResourceValidationFinding {
	level: "error" | "warning";
	message: string;
	resource?: string;
}

export interface ResourceValidationReport {
	schemaVersion: 1;
	command: "resources validate";
	valid: boolean;
	resourceCount: number;
	resources: OlympusResourceMetadata[];
	findings: ResourceValidationFinding[];
}

export const FIRST_PARTY_RESOURCE_METADATA: OlympusResourceMetadata[] = [
	resource(
		"safety-review",
		"Review proposed changes for Olympus safety policy regressions.",
		"skill",
		["olympus safety check", "olympus hooks policy"],
	),
	resource(
		"package-risk-review",
		"Review local Pi package risk without executing package code.",
		"skill",
		["olympus package evaluate"],
	),
	resource(
		"extension-authoring",
		"Guide first-party Pi extension skeleton authoring and metadata inspection.",
		"skill",
		["olympus extension inspect"],
	),
	resource(
		"sandbox-troubleshooting",
		"Troubleshoot sandbox readiness and fake-home denial evidence.",
		"skill",
		["olympus sandbox check"],
	),
	resource(
		"cleanup-audit",
		"Audit cleanup proposals without performing cleanup.",
		"skill",
		["olympus cleanup audit"],
	),
	resource(
		"verification-handoff",
		"Prepare verification evidence and compact handoff summaries.",
		"skill",
		["olympus verify", "olympus handoff current"],
	),
	resource(
		"rtk-aware-command-guidance",
		"Prefer RTK-backed guidance for output-heavy commands when RTK is available.",
		"skill",
		["olympus rtk status", "olympus compact"],
	),
	resource(
		"plan-review",
		"Prompt template for deterministic plan review and approval boundaries.",
		"prompt",
		["/olympus-plan-review"],
	),
	resource(
		"prompt-contract",
		"Prompt template that preserves goal, paths, constraints, non-goals, and stop conditions.",
		"prompt",
		["/olympus-prompt-contract"],
	),
	resource(
		"quota-aware-workflow",
		"Prompt template for quota-aware workflow choices without invented limits.",
		"prompt",
		["/olympus-quota-aware-workflow"],
	),
	resource(
		"rtk-aware-command-guidance-prompt",
		"Prompt template for RTK-aware command selection in output-heavy workflows.",
		"prompt",
		["/olympus-rtk-guidance"],
	),
];

function resource(
	name: string,
	description: string,
	resourceKind: OlympusResourceKind,
	commands: string[],
): OlympusResourceMetadata {
	return {
		schemaVersion: 1,
		name,
		description,
		resourceKind,
		olympusOwned: true,
		provenance: "first-party",
		supportFiles: [{ path: `resources/${resourceKind}s/${name}/README.md` }],
		commands,
		nonGoals: [
			"global ~/.pi install",
			"third-party code execution",
			"uncontrolled swarm behavior",
		],
		verification:
			"Validated by olympus resources validate and manifest-owned install planning only.",
	};
}
