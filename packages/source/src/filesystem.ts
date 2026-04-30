import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";

export async function readDirectoryIfPresent(
	path: string,
): Promise<readonly Dirent[]> {
	try {
		return await readdir(path, { withFileTypes: true });
	} catch (error) {
		if (isNotFoundError(error)) {
			return [];
		}
		throw error;
	}
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
