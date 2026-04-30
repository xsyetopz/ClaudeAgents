import type { Dirent } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { WritePlanEntry } from "./write-plan-types";

export async function listExistingFiles(
	outDir: string,
): Promise<Map<string, string>> {
	const files = new Map<string, string>();
	const entries = await listFiles(outDir);
	for (const path of entries) {
		const relativePath = relative(outDir, path);
		files.set(relativePath, await Bun.file(path).text());
	}
	return files;
}

export async function applyWritePlanEntry(
	outDir: string,
	entry: WritePlanEntry,
): Promise<void> {
	const path = join(outDir, entry.path);
	if (entry.action === "remove") {
		await rm(path, { force: true });
		return;
	}

	if (entry.action === "unchanged") {
		return;
	}

	if (entry.content === undefined) {
		throw new Error(`Missing content for write-plan entry '${entry.path}'.`);
	}

	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, entry.content);
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

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
