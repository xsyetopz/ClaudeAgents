import type { SourceGraph } from "@openagentlayer/types";

export interface GraphSummary {
	readonly records: number;
	readonly agents: number;
	readonly skills: number;
	readonly commands: number;
	readonly policies: number;
	readonly guidance: number;
	readonly modelPlans: number;
	readonly surfaceConfigs: number;
}

export function summarizeGraph(graph: SourceGraph): GraphSummary {
	return {
		records: graph.records.length,
		agents: graph.agents.length,
		skills: graph.skills.length,
		commands: graph.commands.length,
		policies: graph.policies.length,
		guidance: graph.guidance.length,
		modelPlans: graph.modelPlans.length,
		surfaceConfigs: graph.surfaceConfigs.length,
	};
}

export function graphToJson(graph: SourceGraph): unknown {
	return {
		...summarizeGraph(graph),
		record_ids: graph.records.map((record) => `${record.kind}:${record.id}`),
	};
}
