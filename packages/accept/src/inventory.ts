import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const TRACKED_PRODUCT_ROOTS = [
	"packages",
	"source",
	"tests",
	"homebrew",
	"marketplace",
] as const;
const REFERENCE_ROOTS = ["v3_legacy", "docs", "third_party"] as const;
const ROOT_PRODUCT_FILES = [
	"package.json",
	"tsconfig.json",
	"tsconfig.base.json",
	"biome.jsonc",
	"README.md",
	"CHANGELOG.md",
	"CONTRIBUTING.md",
	"SECURITY.md",
	"upstream-sources.lock.json",
	"bunfig.toml",
] as const;
const PRODUCT_FILE_PATTERN = /\.(ts|mts|mjs|json|jsonc|md|toml)$/;
const GENERATED_PATH_PATTERN = /(^|\/)(generated|dist|build)(\/|$)/;

export interface RepositoryInventory {
	authoredSourcePaths: string[];
	generatedOutputPaths: string[];
	runtimeHookPaths: string[];
	cliGeneratorDeployerPaths: string[];
	validationPaths: string[];
	v3ReferencePaths: string[];
	disconnectedPaths: string[];
}

export async function inspectRepository(
	repoRoot: string,
): Promise<RepositoryInventory> {
	const allFiles = await listFiles(repoRoot);
	const relativeFiles = allFiles.map((path) => relative(repoRoot, path));
	const inventory: RepositoryInventory = {
		authoredSourcePaths: relativeFiles.filter((path) =>
			path.startsWith("source/"),
		),
		generatedOutputPaths: relativeFiles.filter((path) =>
			GENERATED_PATH_PATTERN.test(path),
		),
		runtimeHookPaths: relativeFiles.filter((path) =>
			path.startsWith("packages/runtime/hooks/"),
		),
		cliGeneratorDeployerPaths: relativeFiles.filter(
			(path) =>
				path.startsWith("packages/cli/") ||
				path.startsWith("packages/adapter/") ||
				path.startsWith("packages/deploy/"),
		),
		validationPaths: relativeFiles.filter(
			(path) =>
				path.startsWith("packages/accept/") ||
				path.startsWith("packages/policy/"),
		),
		v3ReferencePaths: relativeFiles.filter((path) =>
			path.startsWith("v3_legacy/"),
		),
		disconnectedPaths: [],
	};
	inventory.disconnectedPaths = findDisconnectedProductPaths(relativeFiles);
	return inventory;
}

export async function assertRepositoryInventory(
	repoRoot: string,
): Promise<void> {
	const inventory = await inspectRepository(repoRoot);
	assertNonEmpty("authored source", inventory.authoredSourcePaths);
	assertNonEmpty("runtime hooks", inventory.runtimeHookPaths);
	assertNonEmpty("CLI/generator/deployer", inventory.cliGeneratorDeployerPaths);
	assertNonEmpty("validation", inventory.validationPaths);
	assertNonEmpty("v3 reference", inventory.v3ReferencePaths);
	if (inventory.disconnectedPaths.length > 0)
		throw new Error(
			`Disconnected active product files: ${inventory.disconnectedPaths.join(", ")}`,
		);
}

function assertNonEmpty(label: string, paths: string[]): void {
	if (paths.length === 0)
		throw new Error(`Repository inventory has no ${label} paths.`);
}

function findDisconnectedProductPaths(relativeFiles: string[]): string[] {
	const active = new Set<string>();
	for (const rootFile of ROOT_PRODUCT_FILES) active.add(rootFile);
	for (const file of relativeFiles) {
		if (TRACKED_PRODUCT_ROOTS.some((root) => file.startsWith(`${root}/`)))
			active.add(file);
		if (REFERENCE_ROOTS.some((root) => file.startsWith(`${root}/`)))
			active.add(file);
		if (file === "bun.lock" || file.startsWith(".rtk/")) active.add(file);
	}
	return relativeFiles.filter(
		(file) =>
			PRODUCT_FILE_PATTERN.test(file) &&
			!active.has(file) &&
			!file.startsWith("node_modules/"),
	);
}

async function listFiles(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (entry.name === ".git" || entry.name === "node_modules") continue;
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...(await listFiles(path)));
		else if (entry.isFile() && (await stat(path)).size < 1_000_000)
			files.push(path);
	}
	return files;
}
