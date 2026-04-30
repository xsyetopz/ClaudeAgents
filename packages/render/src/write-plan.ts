import type { Dirent } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import { graphToJson } from "@openagentlayer/source/graph";
import type { Diagnostic, SourceGraph } from "@openagentlayer/types";
import { createRenderContext } from "./context";
import { createAdapterRegistry } from "./registry";

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

export async function createWritePlan(
	graph: SourceGraph,
	outDir: string,
): Promise<WritePlan> {
	const absoluteOutDir = resolve(outDir);
	const desired = createDesiredFiles(graph);
	const diagnostics = collectBundleDiagnostics(graph);
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
		const path = join(plan.outDir, entry.path);
		if (entry.action === "remove") {
			await rm(path, { force: true });
			continue;
		}

		if (entry.action === "unchanged") {
			continue;
		}

		if (entry.content === undefined) {
			throw new Error(`Missing content for write-plan entry '${entry.path}'.`);
		}

		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, entry.content);
	}
}

export function serializeWritePlan(plan: WritePlan): string {
	const lines = plan.entries.map((entry) => `${entry.action}\t${entry.path}`);
	return `${lines.join("\n")}\n`;
}

function createDesiredFiles(graph: SourceGraph): Map<string, string> {
	const context = createRenderContext(graph);
	const desiredFiles = new Map([
		[
			"manifest.json",
			`${stableJson({ generated_by: "openagentlayer", context })}\n`,
		],
		["graph.json", `${stableJson(graphToJson(graph))}\n`],
	]);

	const registry = createAdapterRegistry();
	for (const bundle of registry.renderAllBundles(graph)) {
		for (const artifact of bundle.artifacts) {
			desiredFiles.set(artifact.path, artifact.content);
		}
		desiredFiles.set(
			`surfaces/${bundle.surface}/bundle.json`,
			`${stableJson({
				adapterId: bundle.adapterId,
				artifacts: bundle.artifacts.map((artifact: AdapterArtifact) => ({
					kind: artifact.kind,
					path: artifact.path,
					sourceRecordIds: artifact.sourceRecordIds,
					surface: artifact.surface,
				})),
				diagnostics: bundle.diagnostics,
				surface: bundle.surface,
			})}\n`,
		);
	}

	return desiredFiles;
}

function collectBundleDiagnostics(graph: SourceGraph): readonly Diagnostic[] {
	return createAdapterRegistry()
		.renderAllBundles(graph)
		.flatMap((bundle) => bundle.diagnostics)
		.sort(
			(left, right) =>
				left.code.localeCompare(right.code) ||
				(left.path ?? "").localeCompare(right.path ?? "") ||
				left.message.localeCompare(right.message),
		);
}

async function listExistingFiles(outDir: string): Promise<Map<string, string>> {
	const files = new Map<string, string>();
	const entries = await listFiles(outDir);
	for (const path of entries) {
		const relativePath = relative(outDir, path);
		files.set(relativePath, await Bun.file(path).text());
	}
	return files;
}

async function listFiles(directory: string): Promise<readonly string[]> {
	let entries: readonly Dirent[];
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (isNotFoundError(error)) {
			return [];
		}
		throw error;
	}

	const results: string[] = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await listFiles(path)));
		} else if (entry.isFile()) {
			results.push(path);
		}
	}
	return results.sort();
}

function stableJson(value: unknown): string {
	return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortJson);
	}

	if (typeof value !== "object" || value === null) {
		return value;
	}

	const record = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		sorted[key] = sortJson(record[key]);
	}
	return sorted;
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
