import type { Diagnostic } from "@openagentlayer/types";

export type WritePlanAction = "add" | "change" | "remove" | "unchanged";

export interface WritePlanEntry {
	readonly action: WritePlanAction;
	readonly path: string;
	readonly content?: string;
}

export interface WritePlan {
	readonly outDir: string;
	readonly entries: readonly WritePlanEntry[];
	readonly diagnostics: readonly Diagnostic[];
}
