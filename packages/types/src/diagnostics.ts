export type DiagnosticLevel = "error" | "warning";

export interface Diagnostic {
	readonly level: DiagnosticLevel;
	readonly code: string;
	readonly message: string;
	readonly path?: string;
}
