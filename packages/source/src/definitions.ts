import type { SourceRecord } from "@openagentlayer/types";

export interface RecordDefinition {
	readonly kind: SourceRecord["kind"];
	readonly directory: string;
	readonly metadataName: string;
}

export const RECORD_DEFINITIONS: readonly RecordDefinition[] = [
	{ kind: "agent", directory: "agents", metadataName: "agent.toml" },
	{ kind: "skill", directory: "skills", metadataName: "skill.toml" },
	{ kind: "command", directory: "commands", metadataName: "command.toml" },
	{ kind: "policy", directory: "policies", metadataName: "policy.toml" },
	{ kind: "guidance", directory: "guidance", metadataName: "guidance.toml" },
	{
		kind: "model-plan",
		directory: "model-plans",
		metadataName: "model-plan.toml",
	},
	{
		kind: "surface-config",
		directory: "surface-configs",
		metadataName: "surface-config.toml",
	},
];
