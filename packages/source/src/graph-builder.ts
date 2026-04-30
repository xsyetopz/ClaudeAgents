import type {
	AgentRecord,
	CommandRecord,
	GuidanceRecord,
	ModelPlanRecord,
	PolicyRecord,
	SkillRecord,
	SourceGraph,
	SourceRecord,
	SurfaceConfigRecord,
} from "@openagentlayer/types";

export function buildGraph(records: readonly SourceRecord[]): SourceGraph {
	const sortedRecords = [...records].sort(compareRecords);
	const byId = new Map(
		sortedRecords.map((record) => [record.id, record] as const),
	);
	return {
		records: sortedRecords,
		byId,
		agents: sortedRecords.filter(
			(record): record is AgentRecord => record.kind === "agent",
		),
		skills: sortedRecords.filter(
			(record): record is SkillRecord => record.kind === "skill",
		),
		commands: sortedRecords.filter(
			(record): record is CommandRecord => record.kind === "command",
		),
		policies: sortedRecords.filter(
			(record): record is PolicyRecord => record.kind === "policy",
		),
		guidance: sortedRecords.filter(
			(record): record is GuidanceRecord => record.kind === "guidance",
		),
		modelPlans: sortedRecords.filter(
			(record): record is ModelPlanRecord => record.kind === "model-plan",
		),
		surfaceConfigs: sortedRecords.filter(
			(record): record is SurfaceConfigRecord =>
				record.kind === "surface-config",
		),
	};
}

function compareRecords(left: SourceRecord, right: SourceRecord): number {
	return left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id);
}
