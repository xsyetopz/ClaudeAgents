import { resolve } from "node:path";
import type { SourceGraph } from "@openagentlayer/types";
import { applyWritePlanEntry, listExistingFiles } from "./filesystem";
import {
	collectDesiredDiagnostics,
	createDesiredFiles,
} from "./render-artifacts";
import type { WritePlan, WritePlanEntry } from "./write-plan-types";

export type {
	WritePlan,
	WritePlanAction,
	WritePlanEntry,
} from "./write-plan-types";

export async function createWritePlan(
	graph: SourceGraph,
	outDir: string,
): Promise<WritePlan> {
	const absoluteOutDir = resolve(outDir);
	const desired = createDesiredFiles(graph);
	const diagnostics = collectDesiredDiagnostics(graph);
	const existing = await listExistingFiles(absoluteOutDir);
	const entries: WritePlanEntry[] = [];

	for (const [path, content] of [...desired.entries()].sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		const existingContent = existing.get(path);
		if (existingContent === undefined) {
			entries.push({ action: "add", path, content });
			continue;
		}
		entries.push(
			existingContent === content
				? { action: "unchanged", path, content }
				: { action: "change", path, content },
		);
		existing.delete(path);
	}

	for (const path of [...existing.keys()].sort()) {
		entries.push({ action: "remove", path });
	}

	return { outDir: absoluteOutDir, entries, diagnostics };
}

export async function applyWritePlan(plan: WritePlan): Promise<void> {
	for (const entry of plan.entries) {
		await applyWritePlanEntry(plan.outDir, entry);
	}
}

export function serializeWritePlan(plan: WritePlan): string {
	const lines = plan.entries.map((entry) => `${entry.action}\t${entry.path}`);
	return `${lines.join("\n")}\n`;
}
