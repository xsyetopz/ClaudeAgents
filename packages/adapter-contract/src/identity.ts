import type { Surface } from "@openagentlayer/types";

export type AdapterId = Surface;

export interface AdapterContext {
	readonly surface: Surface;
	readonly deterministicId: string;
	readonly records: readonly string[];
	readonly modelPlanId?: string;
}
