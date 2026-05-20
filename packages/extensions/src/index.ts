/** Aegis extension manifest and pure policy decision helpers. */
export {
	AEGIS_EXTENSION_MANIFEST,
	aegisDecide,
	aegisPolicyStatus,
} from "./aegis/index.ts";
/** Status and install contracts for the Pi runtime entrypoint. */
export type {
	AegisInstallReport,
	AegisInstallScope,
	AegisPiRuntimeStatus,
	AegisUninstallReport,
} from "./aegis/pi-runtime.ts";
/** Pi runtime entrypoint creation, installation, and event mapping helpers. */
export {
	aegisPiRuntimeStatus,
	createAegisPiExtension,
	handleAegisEvent,
	installAegisPiExtension,
	installAegisProjectExtension,
	policyEventFromPi,
	uninstallAegisPiExtension,
} from "./aegis/pi-runtime.ts";
/** Extension authoring plan and inspection contracts. */
export type {
	ExtensionCreatePlan,
	ExtensionInspectReport,
} from "./authoring.ts";
/** Extension skeleton creation and inspection helpers. */
export {
	createExtensionSkeleton,
	inferExtensionSourceCapabilities,
	inspectExtensionPath,
} from "./authoring.ts";
/** Primary Pi extension/harness runtime contract. */
export type { OlympiExtensionRuntime } from "./runtime-model.ts";
/** Runtime model used by CLI/status/catalog surfaces. */
export { olympiExtensionRuntime } from "./runtime-model.ts";
