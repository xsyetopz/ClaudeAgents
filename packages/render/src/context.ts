import type { AdapterContext } from "@openagentlayer/adapter-contract";
import type { SourceGraph, Surface } from "@openagentlayer/types";

export interface RenderContext {
	readonly generatedAt: "deterministic";
	readonly records: readonly string[];
}

export function createRenderContext(graph: SourceGraph): RenderContext {
	return {
		generatedAt: "deterministic",
		records: graph.records
			.map((record) => `${record.kind}:${record.id}`)
			.sort(),
	};
}

export function createAdapterContext(
	graph: SourceGraph,
	surface: Surface,
	options: { readonly modelPlanId?: string } = {},
): AdapterContext {
	const context = createRenderContext(graph);
	return {
		surface,
		deterministicId: `oal:${surface}:${context.records.join(",")}`,
		records: context.records,
		...(options.modelPlanId === undefined
			? {}
			: { modelPlanId: options.modelPlanId }),
	};
}
