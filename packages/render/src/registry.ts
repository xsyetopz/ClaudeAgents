import type {
	AdapterBundle,
	SurfaceAdapter,
} from "@openagentlayer/adapter-contract";
import { createClaudeAdapter } from "@openagentlayer/adapters/providers/claude";
import { createCodexAdapter } from "@openagentlayer/adapters/providers/codex";
import { createOpenCodeAdapter } from "@openagentlayer/adapters/providers/opencode";
import type { Diagnostic, SourceGraph, Surface } from "@openagentlayer/types";
import { SURFACES } from "@openagentlayer/types/constants";
import { createAdapterContext } from "./context";

export interface RenderSurfaceOptions {
	readonly modelPlanId?: string;
}

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

function validateModelPlanOption(
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

export function createDefaultAdapters(): readonly SurfaceAdapter[] {
	return [createCodexAdapter(), createClaudeAdapter(), createOpenCodeAdapter()];
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

function normalizeBundle(
	adapter: SurfaceAdapter,
	bundle: AdapterBundle,
): AdapterBundle {
	const diagnostics = bundle.diagnostics.concat(adapter.validateBundle(bundle));
	return {
		...bundle,
		artifacts: [...bundle.artifacts].sort((left, right) =>
			left.path.localeCompare(right.path),
		),
		diagnostics: diagnostics.sort(
			(left, right) =>
				left.code.localeCompare(right.code) ||
				(left.path ?? "").localeCompare(right.path ?? "") ||
				left.message.localeCompare(right.message),
		),
	};
}

function compareAdapters(left: SurfaceAdapter, right: SurfaceAdapter): number {
	return left.surface.localeCompare(right.surface);
}
