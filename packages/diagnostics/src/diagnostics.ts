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

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
	return diagnostics.some((diagnostic) => diagnostic.level === "error");
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
