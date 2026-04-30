import type { Diagnostic } from "@openagentlayer/types";

export function errorDiagnostic(
	code: string,
	message: string,
	path?: string,
): Diagnostic {
	return withOptionalPath({ level: "error", code, message }, path);
}

export function warningDiagnostic(
	code: string,
	message: string,
	path?: string,
): Diagnostic {
	return withOptionalPath({ level: "warning", code, message }, path);
}

function withOptionalPath(
	diagnostic: Omit<Diagnostic, "path">,
	path: string | undefined,
): Diagnostic {
	if (path === undefined) {
		return diagnostic;
	}

	return { ...diagnostic, path };
}
