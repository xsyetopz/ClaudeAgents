import type { Diagnostic } from "@openagentlayer/types";

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
	return diagnostics.some((diagnostic) => diagnostic.level === "error");
}
