import type { Diagnostic, SourceGraph, Surface } from "@openagentlayer/types";

export interface RenderSurfaceOptions {
	readonly modelPlanId?: string;
}

export function validateModelPlanOption(
	graph: SourceGraph,
	surface: Surface,
	options: RenderSurfaceOptions,
): Diagnostic | undefined {
	if (options.modelPlanId === undefined) {
		return undefined;
	}

	const modelPlan = graph.modelPlans.find(
		(record) =>
			record.id === options.modelPlanId && record.surfaces.includes(surface),
	);
	if (modelPlan !== undefined) {
		return undefined;
	}

	return {
		code: "unknown-model-plan",
		level: "error",
		message: `Unknown model plan '${options.modelPlanId}' for surface '${surface}'.`,
	};
}
