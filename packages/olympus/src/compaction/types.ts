export type CompactionKind =
	| "generic"
	| "git"
	| "test"
	| "search"
	| "package-manager"
	| "stack-trace";

export type CompactionMode = "compact" | "verbose" | "raw";

export type RtkAvailability = "available" | "unavailable";

export type RtkCommandCategory =
	| "shell-output"
	| "read"
	| "grep-find-rg"
	| "git-diff-status-log"
	| "test-output"
	| "package-manager-logs";

export interface RtkCommandRecommendation {
	category: RtkCommandCategory;
	supported: boolean;
	preferredWhenAvailable: boolean;
	recommendation: string;
}

export interface RtkStatusReport {
	schemaVersion: 1;
	command: "rtk status";
	status: RtkAvailability;
	path: string | null;
	degradedReason: string | null;
	recommendations: RtkCommandRecommendation[];
}

export interface CompactionInput {
	text: string;
	kind?: CompactionKind | "auto";
	mode?: CompactionMode;
	exitStatus?: number | null;
	sourcePath?: string;
	env?: NodeJS.ProcessEnv;
}

export interface CompactionReport {
	schemaVersion: 1;
	command: "compact";
	kind: CompactionKind;
	mode: CompactionMode;
	rtkStatus: RtkAvailability;
	rtkPath: string | null;
	rtkPreferred: boolean;
	rtkCommandRecommendation: string;
	fallbackReason: string | null;
	rawOutputReference: string | null;
	exitStatus: number | null;
	criticalContext: string[];
	redactions: string[];
	warnings: string[];
	summary: string[];
	rawOutput: string | null;
	savedBytesEstimate: number;
	tokenEstimateBefore: number;
	tokenEstimateAfter: number;
	deterministicDigest: string;
}
