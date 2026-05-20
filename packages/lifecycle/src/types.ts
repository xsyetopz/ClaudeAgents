export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5;

export type ResourceKind = "skill" | "prompt" | "theme" | "extension";

export type RiskLabel =
	| "PASSIVE"
	| "EXECUTABLE"
	| "UNSIGNED"
	| "LOCKED"
	| "HASH MISMATCH"
	| "GLOBAL WRITE"
	| "TRUSTED PASSIVE"
	| "TRUSTED EXECUTABLE"
	| "REVOKED"
	| "SANDBOXED"
	| "HOME DENIED"
	| "NETWORK DENIED";

export interface PackageIdentity {
	name: string;
	version: string;
	sourceType: "local";
	source: string;
	contentDigest: string;
}

export interface PiManifestSummary {
	present: boolean;
	paths: string[];
}

export interface SupportFile {
	path: string;
	hash: string;
}

export interface ResourceReport {
	id: string;
	kind: ResourceKind;
	path: string;
	passive: boolean;
	executable: boolean;
	hash: string;
	labels: RiskLabel[];
	supportFiles: SupportFile[];
}

export interface ExecutableReport {
	id: string;
	kind: "extension" | "script" | "lifecycle-script" | "support-script";
	path?: string;
	command?: string;
	hash?: string;
	labels: RiskLabel[];
}

export interface ScriptReport {
	name: string;
	command: string;
	lifecycle: boolean;
	labels: RiskLabel[];
}

export interface InspectionReport {
	schemaVersion: 1;
	package: PackageIdentity;
	piManifest: PiManifestSummary;
	resources: ResourceReport[];
	executables: ExecutableReport[];
	scripts: ScriptReport[];
	warnings: string[];
	decision: "inspect-only";
}

export interface EvaluationReport {
	schemaVersion: 1;
	inspection: InspectionReport;
	conflicts: string[];
	labels: RiskLabel[];
	decision:
		| "reject"
		| "inspect-more"
		| "trust-passive"
		| "trust-executable-deferred"
		| "install-passive"
		| "vendor"
		| "fork";
	recommendation: string;
}

export class OlympiError extends Error {
	readonly exitCode: ExitCode;
	readonly code?: string;
	readonly input?: string;
	readonly expected?: string;
	readonly written?: string[];

	constructor(
		message: string,
		exitCode: ExitCode,
		details: {
			code?: string;
			input?: string;
			expected?: string;
			written?: string[];
		} = {},
	) {
		super(message);
		this.name = "OlympiError";
		this.exitCode = exitCode;
		if (details.code !== undefined) this.code = details.code;
		if (details.input !== undefined) this.input = details.input;
		if (details.expected !== undefined) this.expected = details.expected;
		if (details.written !== undefined) this.written = details.written;
	}
}
