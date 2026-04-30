import type {
	Diagnostic,
	SourceGraph,
	SourceRecord,
	Surface,
} from "@openagentlayer/types";
import type {
	AdapterBundle,
	AdapterCapability,
	AdapterRenderResult,
} from "./artifacts";
import type { AdapterContext, AdapterId } from "./identity";
import type { InstallOptions, InstallPlan } from "./install";

export interface SurfaceAdapter {
	readonly id: AdapterId;
	readonly surface: Surface;
	readonly capabilities: readonly AdapterCapability[];
	readonly supports: (record: SourceRecord) => boolean;
	readonly render: (
		record: SourceRecord,
		context: AdapterContext,
	) => AdapterRenderResult;
	readonly renderBundle: (
		graph: SourceGraph,
		context: AdapterContext,
	) => AdapterBundle;
	readonly validateBundle: (bundle: AdapterBundle) => readonly Diagnostic[];
	readonly installPlan: (
		bundle: AdapterBundle,
		options: InstallOptions,
	) => InstallPlan;
}
