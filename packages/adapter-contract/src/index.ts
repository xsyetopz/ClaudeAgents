/* biome-ignore-all lint/performance/noBarrelFile: package public API entrypoint */
export type {
	AdapterArtifact,
	AdapterArtifactInstallMode,
	AdapterArtifactKind,
	AdapterBundle,
	AdapterCapability,
	AdapterRenderResult,
} from "./artifacts";
export type { AdapterContext, AdapterId } from "./identity";
export type {
	InstallOptions,
	InstallPlan,
	InstallPlanEntry,
	InstallScope,
} from "./install";
export type { SurfaceAdapter } from "./surface-adapter";
export {
	createUnsupportedCapabilityDiagnostic,
	type UnsupportedCapabilityDiagnostic,
	validateAdapterBundle,
} from "./validation";
