import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
	directoryExists,
	fileExists,
	hashFile,
	hashPackageTree,
	toPosix,
} from "./hashing.js";
import {
	type ExecutableReport,
	type InspectionReport,
	OlympiError,
	type ResourceKind,
	type ResourceReport,
	type RiskLabel,
	type ScriptReport,
	type SupportFile,
} from "./types.js";

const LIFECYCLE_SCRIPT_NAMES = new Set([
	"preinstall",
	"install",
	"postinstall",
	"prepack",
	"prepare",
	"prepublish",
	"prepublishOnly",
]);
const JAVASCRIPT_EXTENSIONS = new Set([
	".js",
	".mjs",
	".cjs",
	".ts",
	".mts",
	".cts",
]);
const SCRIPT_EXTENSIONS = new Set([
	".sh",
	".bash",
	".zsh",
	".fish",
	".ps1",
	".js",
	".mjs",
	".cjs",
	".ts",
]);
const LEADING_DOT_SLASH = /^\.\//;

interface PackageJson {
	name?: unknown;
	version?: unknown;
	pi?: unknown;
	scripts?: unknown;
}

interface PiManifest {
	extensions: string[];
	skills: string[];
	prompts: string[];
	themes: string[];
	paths: string[];
	present: boolean;
}

interface ResourceCandidate {
	kind: ResourceKind;
	path: string;
	declared: boolean;
}

export async function inspectLocalPackage(
	inputPath: string,
): Promise<InspectionReport> {
	const rootPath = await resolvePackagePath(inputPath);
	const packageJsonPath = path.join(rootPath, "package.json");
	if (!(await fileExists(packageJsonPath))) {
		throw new OlympiError(`missing package.json at ${packageJsonPath}`, 2);
	}

	const packageJson = await readPackageJson(packageJsonPath);
	const piManifest = readPiManifest(packageJson.pi);
	const warnings: string[] = [];
	const candidates = await discoverCandidates(rootPath, piManifest, warnings);
	const resources = await buildResources(rootPath, candidates, warnings);
	const scripts = readScripts(packageJson);
	const executables = await buildExecutables(rootPath, resources, scripts);
	return {
		schemaVersion: 1,
		package: {
			name:
				typeof packageJson.name === "string"
					? packageJson.name
					: path.basename(rootPath),
			version:
				typeof packageJson.version === "string" ? packageJson.version : "0.0.0",
			sourceType: "local",
			source: rootPath,
			contentDigest: await hashPackageTree(rootPath),
		},
		piManifest: {
			present: piManifest.present,
			paths: piManifest.paths,
		},
		resources,
		executables,
		scripts,
		warnings,
		decision: "inspect-only",
	};
}

async function resolvePackagePath(inputPath: string): Promise<string> {
	const candidate = path.resolve(inputPath);
	try {
		const candidateStat = await stat(candidate);
		if (!candidateStat.isDirectory()) {
			throw new OlympiError(`package path is not a directory: ${candidate}`, 2);
		}
		return await realpath(candidate);
	} catch (error) {
		if (error instanceof OlympiError) throw error;
		throw new OlympiError(`package path does not exist: ${candidate}`, 2);
	}
}

async function readPackageJson(packageJsonPath: string): Promise<PackageJson> {
	try {
		return JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "unknown parse error";
		throw new OlympiError(
			`malformed package.json at ${packageJsonPath}: ${message}`,
			2,
		);
	}
}

function readPiManifest(piValue: unknown): PiManifest {
	const manifest = {
		extensions: readPiPaths(piValue, "extensions"),
		skills: readPiPaths(piValue, "skills"),
		prompts: readPiPaths(piValue, "prompts"),
		themes: readPiPaths(piValue, "themes"),
		paths: [] as string[],
		present: typeof piValue === "object" && piValue !== null,
	};
	manifest.paths = [
		...manifest.extensions,
		...manifest.skills,
		...manifest.prompts,
		...manifest.themes,
	];
	return manifest;
}

function readPiPaths(piValue: unknown, key: string): string[] {
	if (typeof piValue !== "object" || piValue === null) return [];
	const record = piValue as Record<string, unknown>;
	const value = record[key];
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => readPiPathEntry(entry));
}

function readPiPathEntry(entry: unknown): string[] {
	if (typeof entry === "string") return [entry];
	if (typeof entry !== "object" || entry === null) return [];
	const record = entry as Record<string, unknown>;
	if (typeof record["path"] === "string") return [record["path"]];
	if (typeof record["file"] === "string") return [record["file"]];
	return [];
}

async function discoverCandidates(
	rootPath: string,
	piManifest: PiManifest,
	warnings: string[],
): Promise<ResourceCandidate[]> {
	const candidates: ResourceCandidate[] = [];
	for (const resourcePath of piManifest.extensions)
		addCandidate(candidates, "extension", resourcePath, true);
	for (const resourcePath of piManifest.skills)
		addCandidate(candidates, "skill", resourcePath, true);
	for (const resourcePath of piManifest.prompts)
		addCandidate(candidates, "prompt", resourcePath, true);
	for (const resourcePath of piManifest.themes)
		addCandidate(candidates, "theme", resourcePath, true);
	await discoverConventionalExtensions(rootPath, candidates);
	await discoverConventionalSkills(rootPath, candidates);
	await discoverConventionalPrompts(rootPath, candidates);
	await discoverConventionalThemes(rootPath, candidates);
	return filterExistingCandidates(rootPath, candidates, warnings);
}

function addCandidate(
	candidates: ResourceCandidate[],
	kind: ResourceKind,
	resourcePath: string,
	declared: boolean,
): void {
	const normalizedPath = normalizeRelativePath(resourcePath);
	if (normalizedPath.length === 0) return;
	candidates.push({ kind, path: normalizedPath, declared });
}

async function filterExistingCandidates(
	rootPath: string,
	candidates: ResourceCandidate[],
	warnings: string[],
): Promise<ResourceCandidate[]> {
	const filtered: ResourceCandidate[] = [];
	const seenKeys = new Set<string>();
	for (const candidate of candidates) {
		const fullPath = path.join(rootPath, candidate.path);
		if (!(await fileExists(fullPath))) {
			if (candidate.declared)
				warnings.push(
					`declared ${candidate.kind} is missing: ${candidate.path}`,
				);
			continue;
		}
		const key = `${candidate.kind}:${candidate.path}`;
		if (seenKeys.has(key)) continue;
		seenKeys.add(key);
		filtered.push(candidate);
	}
	return filtered;
}

async function discoverConventionalExtensions(
	rootPath: string,
	candidates: ResourceCandidate[],
): Promise<void> {
	const extensionsPath = path.join(rootPath, "extensions");
	if (!(await directoryExists(extensionsPath))) return;
	const entries = await readdir(extensionsPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() && isExtensionEntrypoint(entry.name)) {
			addCandidate(candidates, "extension", `extensions/${entry.name}`, false);
			continue;
		}
		if (!entry.isDirectory()) continue;
		for (const indexName of [
			"index.ts",
			"index.js",
			"index.mjs",
			"index.cjs",
		]) {
			const indexPath = `extensions/${entry.name}/${indexName}`;
			if (await fileExists(path.join(rootPath, indexPath)))
				addCandidate(candidates, "extension", indexPath, false);
		}
	}
}

function isExtensionEntrypoint(fileName: string): boolean {
	if (fileName.endsWith(".d.ts")) return false;
	return JAVASCRIPT_EXTENSIONS.has(path.extname(fileName));
}

async function discoverConventionalSkills(
	rootPath: string,
	candidates: ResourceCandidate[],
): Promise<void> {
	const skillsPath = path.join(rootPath, "skills");
	if (!(await directoryExists(skillsPath))) return;
	const entries = await readdir(skillsPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			const skillPath = `skills/${entry.name}/SKILL.md`;
			if (await fileExists(path.join(rootPath, skillPath)))
				addCandidate(candidates, "skill", skillPath, false);
			continue;
		}
		if (entry.isFile() && entry.name.endsWith(".md"))
			addCandidate(candidates, "skill", `skills/${entry.name}`, false);
	}
}

async function discoverConventionalPrompts(
	rootPath: string,
	candidates: ResourceCandidate[],
): Promise<void> {
	const promptsPath = path.join(rootPath, "prompts");
	if (!(await directoryExists(promptsPath))) return;
	const entries = await readdir(promptsPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".md"))
			addCandidate(candidates, "prompt", `prompts/${entry.name}`, false);
	}
}

async function discoverConventionalThemes(
	rootPath: string,
	candidates: ResourceCandidate[],
): Promise<void> {
	const themesPath = path.join(rootPath, "themes");
	if (!(await directoryExists(themesPath))) return;
	const entries = await readdir(themesPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".json"))
			addCandidate(candidates, "theme", `themes/${entry.name}`, false);
	}
}

async function buildResources(
	rootPath: string,
	candidates: ResourceCandidate[],
	warnings: string[],
): Promise<ResourceReport[]> {
	const resources: ResourceReport[] = [];
	const identities = new Map<string, string>();
	const paths = new Set<string>();
	for (const candidate of candidates) {
		const fullPath = path.join(rootPath, candidate.path);
		const resource = await buildResource(
			rootPath,
			candidate,
			fullPath,
			warnings,
		);
		if (identities.has(resource.id))
			warnings.push(`resource identity collision: ${resource.id}`);
		identities.set(resource.id, resource.path);
		if (paths.has(resource.path))
			warnings.push(`resource path collision: ${resource.path}`);
		paths.add(resource.path);
		resources.push(resource);
	}
	return resources.sort((left, right) => left.id.localeCompare(right.id));
}

async function buildResource(
	rootPath: string,
	candidate: ResourceCandidate,
	fullPath: string,
	warnings: string[],
): Promise<ResourceReport> {
	if (candidate.kind === "theme")
		await validateTheme(fullPath, candidate.path, warnings);
	const executable = candidate.kind === "extension";
	return {
		id: `${candidate.kind}:${resourceName(candidate.kind, candidate.path)}`,
		kind: candidate.kind,
		path: candidate.path,
		passive: !executable,
		executable,
		hash: await hashFile(fullPath),
		labels: executable ? ["EXECUTABLE", "UNSIGNED"] : ["PASSIVE", "UNSIGNED"],
		supportFiles:
			candidate.kind === "skill"
				? await skillSupportFiles(rootPath, candidate.path)
				: [],
	};
}

async function validateTheme(
	fullPath: string,
	resourcePath: string,
	warnings: string[],
): Promise<void> {
	try {
		JSON.parse(await readFile(fullPath, "utf8"));
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "unknown parse error";
		warnings.push(`invalid theme JSON at ${resourcePath}: ${message}`);
	}
}

async function skillSupportFiles(
	rootPath: string,
	skillPath: string,
): Promise<SupportFile[]> {
	if (path.basename(skillPath) !== "SKILL.md") return [];
	const skillDirectory = path.join(rootPath, path.dirname(skillPath));
	const supportFiles: SupportFile[] = [];
	await collectSupportFiles(
		rootPath,
		skillDirectory,
		path.join(rootPath, skillPath),
		supportFiles,
	);
	return supportFiles.sort((left, right) =>
		left.path.localeCompare(right.path),
	);
}

async function collectSupportFiles(
	rootPath: string,
	currentPath: string,
	skillFilePath: string,
	supportFiles: SupportFile[],
): Promise<void> {
	const entries = await readdir(currentPath, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(currentPath, entry.name);
		if (entry.isDirectory()) {
			await collectSupportFiles(
				rootPath,
				entryPath,
				skillFilePath,
				supportFiles,
			);
			continue;
		}
		if (!entry.isFile() || entryPath === skillFilePath) continue;
		supportFiles.push({
			path: toPosix(path.relative(rootPath, entryPath)),
			hash: await hashFile(entryPath),
		});
	}
}

function readScripts(packageJson: PackageJson): ScriptReport[] {
	if (typeof packageJson.scripts !== "object" || packageJson.scripts === null)
		return [];
	const scriptEntries = Object.entries(
		packageJson.scripts as Record<string, unknown>,
	);
	return scriptEntries
		.filter((entry): entry is [string, string] => typeof entry[1] === "string")
		.map(([name, command]) => ({
			name,
			command,
			lifecycle: LIFECYCLE_SCRIPT_NAMES.has(name),
			labels: ["EXECUTABLE", "UNSIGNED"] as RiskLabel[],
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

async function buildExecutables(
	rootPath: string,
	resources: ResourceReport[],
	scripts: ScriptReport[],
): Promise<ExecutableReport[]> {
	const extensionExecutables = resources
		.filter((resource) => resource.executable)
		.map((resource) => ({
			id: resource.id,
			kind: "extension" as const,
			path: resource.path,
			hash: resource.hash,
			labels: resource.labels,
		}));
	const scriptExecutables = scripts.map((script) => ({
		id: `script:${script.name}`,
		kind: script.lifecycle
			? ("lifecycle-script" as const)
			: ("script" as const),
		command: script.command,
		labels: script.labels,
	}));
	const supportScriptExecutables = await discoverSupportScripts(
		rootPath,
		resources,
	);
	return [
		...extensionExecutables,
		...scriptExecutables,
		...supportScriptExecutables,
	].sort((left, right) => left.id.localeCompare(right.id));
}

async function discoverSupportScripts(
	rootPath: string,
	resources: ResourceReport[],
): Promise<ExecutableReport[]> {
	const supportScripts: ExecutableReport[] = [];
	for (const resource of resources) {
		for (const supportFile of resource.supportFiles) {
			if (!SCRIPT_EXTENSIONS.has(path.extname(supportFile.path))) continue;
			supportScripts.push({
				id: `support-script:${supportFile.path}`,
				kind: "support-script",
				path: supportFile.path,
				hash: await hashFile(path.join(rootPath, supportFile.path)),
				labels: ["EXECUTABLE", "UNSIGNED"],
			});
		}
	}
	return supportScripts;
}

function resourceName(kind: ResourceKind, resourcePath: string): string {
	if (kind === "skill" && path.basename(resourcePath) === "SKILL.md")
		return path.basename(path.dirname(resourcePath));
	return path.basename(resourcePath, path.extname(resourcePath));
}

function normalizeRelativePath(resourcePath: string): string {
	const normalized = path
		.normalize(resourcePath)
		.replace(LEADING_DOT_SLASH, "");
	if (normalized.startsWith("..") || path.isAbsolute(normalized)) return "";
	return toPosix(normalized);
}
