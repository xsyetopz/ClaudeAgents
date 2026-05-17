import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const IGNORED_PACKAGE_DIRS = new Set([
	".git",
	".hg",
	".svn",
	"node_modules",
	"dist",
	"build",
	"coverage",
	".turbo",
	".next",
]);

export async function hashFile(filePath: string): Promise<string> {
	const bytes = await readFile(filePath);
	return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function hashPackageTree(rootPath: string): Promise<string> {
	const files = await listPackageFiles(rootPath);
	const hash = createHash("sha256");
	for (const file of files) {
		const relativePath = toPosix(path.relative(rootPath, file));
		hash.update(relativePath);
		hash.update("\0");
		hash.update(await readFile(file));
		hash.update("\0");
	}
	return `sha256:${hash.digest("hex")}`;
}

export async function listPackageFiles(rootPath: string): Promise<string[]> {
	const files: string[] = [];
	await walk(rootPath, files);
	return files.sort((left, right) =>
		toPosix(path.relative(rootPath, left)).localeCompare(
			toPosix(path.relative(rootPath, right)),
		),
	);
}

async function walk(currentPath: string, files: string[]): Promise<void> {
	const entries = await readdir(currentPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory() && IGNORED_PACKAGE_DIRS.has(entry.name)) continue;
		const entryPath = path.join(currentPath, entry.name);
		if (entry.isDirectory()) {
			await walk(entryPath, files);
			continue;
		}
		if (!entry.isFile()) continue;
		files.push(entryPath);
	}
}

export async function fileExists(filePath: string): Promise<boolean> {
	try {
		const fileStat = await stat(filePath);
		return fileStat.isFile();
	} catch {
		return false;
	}
}

export async function directoryExists(directoryPath: string): Promise<boolean> {
	try {
		const directoryStat = await stat(directoryPath);
		return directoryStat.isDirectory();
	} catch {
		return false;
	}
}

export function toPosix(value: string): string {
	return value.split(path.sep).join("/");
}
