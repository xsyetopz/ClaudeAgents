import type {
	AdapterBundle,
	SurfaceAdapter,
} from "@openagentlayer/adapter-contract";
import type { Diagnostic } from "@openagentlayer/types";

export function normalizeBundle(
	adapter: SurfaceAdapter,
	bundle: AdapterBundle,
): AdapterBundle {
	const diagnostics = bundle.diagnostics.concat(adapter.validateBundle(bundle));
	return {
		...bundle,
		artifacts: [...bundle.artifacts].sort((left, right) =>
			left.path.localeCompare(right.path),
		),
		diagnostics: diagnostics.sort(compareDiagnostics),
	};
}

function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
	return (
		left.code.localeCompare(right.code) ||
		(left.path ?? "").localeCompare(right.path ?? "") ||
		left.message.localeCompare(right.message)
	);
}
