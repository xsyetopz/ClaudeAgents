export type OlympiResourceKind = "skill" | "prompt" | "command";

export interface OlympiSupportFileMetadata {
	path: string;
	hash?: string;
}

export interface OlympiResourceMetadata {
	schemaVersion: 1;
	name: string;
	description: string;
	resourceKind: OlympiResourceKind;
	olympiOwned: true;
	provenance: "first-party" | "project-local";
	supportFiles: OlympiSupportFileMetadata[];
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
	resources: OlympiResourceMetadata[];
	findings: ResourceValidationFinding[];
}

export const FIRST_PARTY_RESOURCE_METADATA: OlympiResourceMetadata[] = [
	resource(
		"safety-review",
		"Review proposed changes for Olympi safety policy regressions.",
		"skill",
		["olympi safety check", "olympi safety hooks policy"],
	),
	resource(
		"package-risk-review",
		"Review local Pi package risk without executing package code.",
		"skill",
		["olympi package evaluate"],
	),
	resource(
		"extension-authoring",
		"Guide first-party Pi extension skeleton authoring and metadata inspection.",
		"skill",
		["olympi debug extension inspect"],
	),
	resource(
		"sandbox-troubleshooting",
		"Troubleshoot sandbox readiness and fake-home denial evidence.",
		"skill",
		["olympi safety sandbox check"],
	),
	resource(
		"cleanup-audit",
		"Audit cleanup proposals without performing cleanup.",
		"skill",
		["olympi debug audit append"],
	),
	resource(
		"verification-handoff",
		"Prepare verification evidence and compact handoff summaries.",
		"skill",
		["olympi dev verify", "olympi debug handoff current"],
	),
	resource(
		"plan-review",
		"Prompt template for deterministic plan review and approval boundaries.",
		"prompt",
		["/olympi-plan-review"],
	),
	resource(
		"prompt-contract",
		"Prompt template that preserves goal, paths, constraints, non-goals, and stop conditions.",
		"prompt",
		["/olympi-prompt-contract"],
	),
	resource(
		"quota-aware-workflow",
		"Prompt template for quota-aware workflow choices without invented limits.",
		"prompt",
		["/olympi-quota-aware-workflow"],
	),
];

function resource(
	name: string,
	description: string,
	resourceKind: OlympiResourceKind,
	commands: string[],
): OlympiResourceMetadata {
	return {
		schemaVersion: 1,
		name,
		description,
		resourceKind,
		olympiOwned: true,
		provenance: "first-party",
		supportFiles: [{ path: `resources/${resourceKind}s/${name}/README.md` }],
		commands,
		nonGoals: [
			"global ~/.pi install",
			"third-party code execution",
			"uncontrolled swarm behavior",
		],
		verification:
			"Validated by olympi debug resources validate and manifest-owned install planning only.",
	};
}
