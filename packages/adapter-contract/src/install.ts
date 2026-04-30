import type { Surface } from "@openagentlayer/types";

export type InstallScope = "global" | "project";

export interface InstallPlanEntry {
	readonly path: string;
	readonly content: string;
	readonly action: "write" | "remove";
}

export interface InstallPlan {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly entries: readonly InstallPlanEntry[];
}

export interface InstallOptions {
	readonly scope: InstallScope;
	readonly root: string;
}
