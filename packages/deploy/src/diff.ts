import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Artifact } from "@openagentlayer/artifact";
import { mergedContent } from "./merge";
import type { DeployChange, DeployPlan } from "./types";

export interface DeployArtifactDiff {
	provider: Artifact["provider"];
	mode: Artifact["mode"];
	path: string;
	sourceId: string;
	diff: string;
}

export async function planDeployDiffs(
	plan: DeployPlan,
): Promise<DeployArtifactDiff[]> {
	const diffs: DeployArtifactDiff[] = [];
	for (const [index, artifact] of plan.artifacts.entries()) {
		const change = plan.changes[index];
		if (!(change && diffableChange(change))) continue;
		const target = join(plan.targetRoot, artifact.path);
		const before = await readCurrent(target);
		const after = await mergedContent(target, artifact);
		if (before === after) continue;
		diffs.push({
			provider: artifact.provider,
			mode: artifact.mode,
			path: artifact.path,
			sourceId: artifact.sourceId,
			diff: unifiedWholeFileDiff(artifact.path, before, after),
		});
	}
	return diffs;
}

export function renderDeployDiffs(diffs: DeployArtifactDiff[]): string {
	if (diffs.length === 0) return "";
	return `${diffs
		.map((diff) =>
			[
				`## ${diff.provider} ${diff.path} [${diff.mode}]`,
				`source: ${diff.sourceId}`,
				diff.diff.trimEnd(),
			].join("\n"),
		)
		.join("\n\n")}\n`;
}

function diffableChange(change: DeployChange): boolean {
	return change.action === "write" || change.action === "update";
}

async function readCurrent(target: string): Promise<string> {
	try {
		return await readFile(target, "utf8");
	} catch {
		return "";
	}
}

function unifiedWholeFileDiff(
	path: string,
	before: string,
	after: string,
): string {
	const beforeLines = splitLines(before);
	const afterLines = splitLines(after);
	return [
		`--- a/${path}`,
		`+++ b/${path}`,
		`@@ -${rangeHeader(beforeLines.length)} +${rangeHeader(afterLines.length)} @@`,
		...beforeLines.map((line) => `-${line}`),
		...afterLines.map((line) => `+${line}`),
	].join("\n");
}

function rangeHeader(lineCount: number): string {
	if (lineCount === 0) return "0,0";
	return `1,${lineCount}`;
}

function splitLines(text: string): string[] {
	if (text.length === 0) return [];
	const trimmed = text.endsWith("\n") ? text.slice(0, -1) : text;
	return trimmed.length === 0 ? [""] : trimmed.split("\n");
}
