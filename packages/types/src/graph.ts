import type { Diagnostic } from "./diagnostics";
import type {
	AgentRecord,
	CommandRecord,
	GuidanceRecord,
	ModelPlanRecord,
	PolicyRecord,
	SkillRecord,
	SourceRecord,
	SurfaceConfigRecord,
} from "./records";

export interface SourceGraph {
	readonly records: readonly SourceRecord[];
	readonly byId: ReadonlyMap<string, SourceRecord>;
	readonly agents: readonly AgentRecord[];
	readonly skills: readonly SkillRecord[];
	readonly commands: readonly CommandRecord[];
	readonly policies: readonly PolicyRecord[];
	readonly guidance: readonly GuidanceRecord[];
	readonly modelPlans: readonly ModelPlanRecord[];
	readonly surfaceConfigs: readonly SurfaceConfigRecord[];
}

export interface LoadResult {
	readonly graph?: SourceGraph;
	readonly diagnostics: readonly Diagnostic[];
}
