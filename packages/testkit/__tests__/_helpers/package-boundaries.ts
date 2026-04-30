import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export const MAX_PACKAGE_CODE_LINES = 1_500;
export const MAX_BOUNDARY_SCENARIO_LINES = 140;
export const MAX_CLI_FAILURE_SCENARIO_LINES = 140;
export const MAX_CLI_INSTALL_SCENARIO_LINES = 140;
export const MAX_INSTALL_UNINSTALL_SCENARIO_LINES = 140;
export const MAX_RENDER_REGISTRY_SCENARIO_LINES = 140;
export const MAX_RUNTIME_SCENARIO_LINES = 140;
export const PACKAGE_SRC_TEST_PATTERN = /^packages\/[^/]+\/src\//u;

export const PACKAGE_RULES = new Map<string, readonly string[]>([
	[
		"@openagentlayer/source",
		["@openagentlayer/render", "@openagentlayer/install"],
	],
	[
		"@openagentlayer/render",
		["@openagentlayer/cli", "@openagentlayer/install"],
	],
	["@openagentlayer/install", ["@openagentlayer/cli"]],
	[
		"@openagentlayer/adapters",
		["@openagentlayer/cli", "@openagentlayer/install"],
	],
]);

export async function readPackageManifest(packageName: string): Promise<{
	readonly dependencies?: Record<string, string>;
}> {
	const packageDirectory = packageName.replace("@openagentlayer/", "");
	const text = await Bun.file(
		join("packages", packageDirectory, "package.json"),
	).text();
	return JSON.parse(text) as { readonly dependencies?: Record<string, string> };
}

export async function readWorkspacePackageNames(): Promise<readonly string[]> {
	const entries = await readdir("packages", { withFileTypes: true });
	const names: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}
		const manifest = JSON.parse(
			await Bun.file(join("packages", entry.name, "package.json")).text(),
		) as { readonly name?: string };
		if (manifest.name !== undefined) {
			names.push(manifest.name);
		}
	}
	return names.sort();
}

export async function directoryExists(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return false;
		}
		throw error;
	}
}

export async function listFiles(directory: string): Promise<readonly string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const paths: string[] = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			paths.push(...(await listFiles(path)));
		}
		if (entry.isFile()) {
			paths.push(path);
		}
	}
	return paths.sort();
}

export function isPackageCodeFile(path: string): boolean {
	return path.endsWith(".ts") || path.endsWith(".mjs");
}

export function countLines(content: string): number {
	if (content.length === 0) {
		return 0;
	}
	return content.split("\n").length;
}

export async function collectInternalPathViolations(options: {
	readonly internalPathParts: readonly string[];
	readonly excludedPackagePath: string;
}): Promise<readonly string[]> {
	const internalPathPattern = options.internalPathParts.join("/");
	const files = (await listFiles("packages"))
		.filter(isPackageCodeFile)
		.filter((path) => !path.startsWith(options.excludedPackagePath))
		.filter((path) => !path.startsWith("packages/testkit/__tests__/"));
	const violations: string[] = [];
	for (const path of files) {
		const content = await readFile(path, "utf8");
		if (content.includes(internalPathPattern)) {
			violations.push(path);
		}
	}
	return violations;
}
