export {
	AEGIS_EXTENSION_MANIFEST,
	aegisDecide,
	aegisPolicyStatus,
} from "./aegis/index.ts";
export type { AegisPiRuntimeStatus } from "./aegis/pi-runtime.ts";
export {
	aegisPiRuntimeStatus,
	createAegisPiExtension,
	handleAegisEvent,
	installAegisProjectExtension,
	policyEventFromPi,
} from "./aegis/pi-runtime.ts";
export type {
	ExtensionCreatePlan,
	ExtensionInspectReport,
} from "./authoring.ts";
export {
	createExtensionSkeleton,
	inferExtensionSourceCapabilities,
	inspectExtensionPath,
} from "./authoring.ts";
