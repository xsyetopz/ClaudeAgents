import type {
	AdapterBundle,
	SurfaceAdapter,
} from "@openagentlayer/adapter-contract";
import type { SourceGraph, Surface } from "@openagentlayer/types";
import { SURFACES } from "@openagentlayer/types/constants";
import { compareAdapters, createDefaultAdapters } from "./adapters";
import { normalizeBundle } from "./bundle";
import { createAdapterContext } from "./context";
import {
	type RenderSurfaceOptions,
	validateModelPlanOption,
} from "./model-plan";

export type { RenderSurfaceOptions };
export { createDefaultAdapters };

export interface AdapterRegistry {
	readonly adapters: readonly SurfaceAdapter[];
	readonly get: (surface: Surface) => SurfaceAdapter;
	readonly renderSurfaceBundle: (
		graph: SourceGraph,
		surface: Surface,
		options?: RenderSurfaceOptions,
	) => AdapterBundle;
	readonly renderAllBundles: (graph: SourceGraph) => readonly AdapterBundle[];
}

export function createAdapterRegistry(
	adapters: readonly SurfaceAdapter[] = createDefaultAdapters(),
): AdapterRegistry {
	const adapterBySurface = new Map<Surface, SurfaceAdapter>();
	for (const adapter of adapters) {
		adapterBySurface.set(adapter.surface, adapter);
	}

	return {
		adapters: [...adapters].sort(compareAdapters),
		get: (surface) => getAdapter(adapterBySurface, surface),
		renderSurfaceBundle: (graph, surface, options = {}) => {
			const adapter = getAdapter(adapterBySurface, surface);
			const optionDiagnostic = validateModelPlanOption(graph, surface, options);
			if (optionDiagnostic !== undefined) {
				return normalizeBundle(adapter, {
					adapterId: adapter.id,
					artifacts: [],
					diagnostics: [optionDiagnostic],
					surface,
				});
			}
			const context = createAdapterContext(graph, surface, options);
			return normalizeBundle(adapter, adapter.renderBundle(graph, context));
		},
		renderAllBundles: (graph) =>
			SURFACES.map((surface) => {
				const adapter = getAdapter(adapterBySurface, surface);
				const context = createAdapterContext(graph, surface);
				return normalizeBundle(adapter, adapter.renderBundle(graph, context));
			}),
	};
}

function getAdapter(
	adapterBySurface: ReadonlyMap<Surface, SurfaceAdapter>,
	surface: Surface,
): SurfaceAdapter {
	const adapter = adapterBySurface.get(surface);
	if (adapter === undefined) {
		throw new Error(`Unknown surface '${surface}'.`);
	}
	return adapter;
}
