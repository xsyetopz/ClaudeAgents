import type { Stats } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileExists, hashFile, toPosix } from "./hashing";
import { OlympusError } from "./types";

const EXTENSION_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const REGISTER_COMMAND_PATTERN = /registerCommand\(\s*["']([^"']+)["']/g;
const COMMAND_OBJECT_PATTERN = /commands?\s*:\s*\[\s*["']([^"']+)["']/g;
const REGISTER_TOOL_PATTERN = /registerTool\(\s*["']([^"']+)["']/g;
const TOOL_OBJECT_PATTERN = /tools?\s*:\s*\[\s*["']([^"']+)["']/g;
const REGISTER_PROVIDER_PATTERN = /registerProvider\(\s*["']([^"']+)["']/g;
const PROVIDER_OBJECT_PATTERN = /providers?\s*:\s*\[\s*["']([^"']+)["']/g;
const EVENT_PATTERN = /(?:on|subscribe)\(\s*["']([^"']+)["']/g;

export interface ExtensionSideEffects {
	filesystem: string[];
	network: string[];
	process: string[];
	credentials: string[];
}

export interface OlympusExtensionManifest {
	schemaVersion: 1;
	olympusOwned: true;
	name: string;
	purpose: string;
	nonGoals: string[];
	piEvents: string[];
	commands: string[];
	tools: string[];
	sideEffects: ExtensionSideEffects;
	capabilities: string[];
	verification: string;
	uninstall: string;
}

export interface ExtensionEntrypointReport {
	path: string;
	hash: string;
}

export interface ExtensionInspectReport {
	schemaVersion: 1;
	command: "extension inspect";
	path: string;
	entrypoints: ExtensionEntrypointReport[];
	manifest: {
		present: boolean;
		valid: boolean;
		path?: string;
		data?: OlympusExtensionManifest;
		errors: string[];
	};
	inferred: {
		commands: string[];
		tools: string[];
		providers: string[];
		events: string[];
	};
	decision: "inspect-only";
	warnings: string[];
}

export interface ExtensionCreatePlan {
	schemaVersion: 1;
	command: "extension create";
	name: string;
	apply: boolean;
	blocked: boolean;
	targetDirectory: string;
	wouldWrite: string[];
	written: string[];
	reason: string;
}

interface CreateOptions {
	name: string;
	outputDirectory?: string | undefined;
	apply: boolean;
}

interface SkeletonFile {
	relativePath: string;
	content: string;
}

export function validateExtensionName(name: string): void {
	if (!EXTENSION_NAME_PATTERN.test(name)) {
		throw new OlympusError(
			`invalid extension name: ${name}; use lowercase letters, digits, and hyphens, starting with a letter`,
			2,
		);
	}
}

export async function createExtensionSkeleton(
	options: CreateOptions,
): Promise<ExtensionCreatePlan> {
	validateExtensionName(options.name);
	const outputDirectory = options.outputDirectory ?? ".pi/olympus/extensions";
	const targetDirectory = path.resolve(outputDirectory, options.name);
	const files = skeletonFiles(options.name);
	const writePaths = files.map((file) =>
		toPosix(path.join(targetDirectory, file.relativePath)),
	);
	if (!options.apply) {
		return {
			schemaVersion: 1,
			command: "extension create",
			name: options.name,
			apply: false,
			blocked: false,
			targetDirectory,
			wouldWrite: writePaths,
			written: [],
			reason:
				"dry-run only; pass --apply --output <directory> to write the skeleton",
		};
	}
	if (options.outputDirectory === undefined) {
		throw new OlympusError(
			"extension create apply requires --output <directory>; default project .pi writes wait for manifest-backed install",
			3,
		);
	}
	await assertTargetEmpty(targetDirectory);
	for (const file of files) {
		const filePath = path.join(targetDirectory, file.relativePath);
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, file.content);
	}
	return {
		schemaVersion: 1,
		command: "extension create",
		name: options.name,
		apply: true,
		blocked: false,
		targetDirectory,
		wouldWrite: [],
		written: writePaths,
		reason: "generated Olympus-owned first-party extension skeleton",
	};
}

export async function inspectExtensionPath(
	inputPath: string,
): Promise<ExtensionInspectReport> {
	const sourcePath = path.resolve(inputPath);
	const sourceStat = await safeStat(sourcePath);
	const entrypoints = await resolveEntrypoints(sourcePath, sourceStat);
	const manifest = await readExtensionManifest(sourcePath, sourceStat);
	const inferred = await inferExtensionCapabilities(
		sourcePath,
		sourceStat,
		entrypoints,
	);
	const warnings = extensionWarnings(entrypoints, manifest, inferred);
	return {
		schemaVersion: 1,
		command: "extension inspect",
		path: sourcePath,
		entrypoints,
		manifest,
		inferred,
		decision: "inspect-only",
		warnings,
	};
}

export function inferExtensionSourceCapabilities(
	sourceText: string,
): ExtensionInspectReport["inferred"] {
	return {
		commands: uniqueMatches(
			sourceText,
			REGISTER_COMMAND_PATTERN,
			COMMAND_OBJECT_PATTERN,
		).map(formatCommand),
		tools: uniqueMatches(
			sourceText,
			REGISTER_TOOL_PATTERN,
			TOOL_OBJECT_PATTERN,
		),
		providers: uniqueMatches(
			sourceText,
			REGISTER_PROVIDER_PATTERN,
			PROVIDER_OBJECT_PATTERN,
		),
		events: uniqueMatches(sourceText, EVENT_PATTERN),
	};
}

async function assertTargetEmpty(targetDirectory: string): Promise<void> {
	try {
		const entries = await readdir(targetDirectory);
		if (entries.length > 0) {
			throw new OlympusError(
				`extension target directory is not empty: ${targetDirectory}`,
				3,
			);
		}
	} catch (error) {
		if (error instanceof OlympusError) throw error;
	}
}

async function safeStat(sourcePath: string): Promise<Stats> {
	try {
		return await stat(sourcePath);
	} catch {
		throw new OlympusError(`extension path does not exist: ${sourcePath}`, 2);
	}
}

async function resolveEntrypoints(
	sourcePath: string,
	sourceStat: Stats,
): Promise<ExtensionEntrypointReport[]> {
	if (sourceStat.isFile())
		return [{ path: sourcePath, hash: await hashFile(sourcePath) }];
	if (!sourceStat.isDirectory()) {
		throw new OlympusError(
			`extension path is not a file or directory: ${sourcePath}`,
			2,
		);
	}
	const candidates = [
		"index.ts",
		"index.js",
		"index.mjs",
		"index.cjs",
		"src/index.ts",
		"src/index.js",
	];
	const entrypoints: ExtensionEntrypointReport[] = [];
	for (const candidate of candidates) {
		const candidatePath = path.join(sourcePath, candidate);
		if (await fileExists(candidatePath)) {
			entrypoints.push({
				path: toPosix(path.relative(sourcePath, candidatePath)),
				hash: await hashFile(candidatePath),
			});
		}
	}
	return entrypoints;
}

async function readExtensionManifest(
	sourcePath: string,
	sourceStat: Stats,
): Promise<ExtensionInspectReport["manifest"]> {
	if (!sourceStat.isDirectory())
		return { present: false, valid: false, errors: [] };
	const manifestPath = path.join(sourcePath, "olympus-extension.json");
	if (!(await fileExists(manifestPath)))
		return { present: false, valid: false, errors: [] };
	try {
		const data = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
		const errors = validateManifestData(data);
		const base = {
			present: true,
			valid: errors.length === 0,
			path: "olympus-extension.json",
			errors,
		};
		return errors.length === 0
			? { ...base, data: data as OlympusExtensionManifest }
			: base;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "unknown parse error";
		return {
			present: true,
			valid: false,
			path: "olympus-extension.json",
			errors: [`malformed olympus-extension.json: ${message}`],
		};
	}
}

async function inferExtensionCapabilities(
	sourcePath: string,
	sourceStat: Stats,
	entrypoints: ExtensionEntrypointReport[],
): Promise<ExtensionInspectReport["inferred"]> {
	const sourceTexts: string[] = [];
	if (sourceStat.isFile()) {
		sourceTexts.push(await readFile(sourcePath, "utf8"));
	} else {
		for (const entrypoint of entrypoints) {
			sourceTexts.push(
				await readFile(path.join(sourcePath, entrypoint.path), "utf8"),
			);
		}
	}
	const merged = {
		commands: new Set<string>(),
		tools: new Set<string>(),
		providers: new Set<string>(),
		events: new Set<string>(),
	};
	for (const sourceText of sourceTexts) {
		const inferred = inferExtensionSourceCapabilities(sourceText);
		for (const command of inferred.commands) merged.commands.add(command);
		for (const tool of inferred.tools) merged.tools.add(tool);
		for (const provider of inferred.providers) merged.providers.add(provider);
		for (const event of inferred.events) merged.events.add(event);
	}
	return {
		commands: [...merged.commands].sort(),
		tools: [...merged.tools].sort(),
		providers: [...merged.providers].sort(),
		events: [...merged.events].sort(),
	};
}

function validateManifestData(data: unknown): string[] {
	if (typeof data !== "object" || data === null)
		return ["manifest must be an object"];
	const record = data as Record<string, unknown>;
	const errors: string[] = [];
	if (record["schemaVersion"] !== 1) errors.push("schemaVersion must be 1");
	if (record["olympusOwned"] !== true) errors.push("olympusOwned must be true");
	for (const key of ["name", "purpose", "verification", "uninstall"]) {
		if (typeof record[key] !== "string" || record[key].length === 0)
			errors.push(`${key} must be a non-empty string`);
	}
	for (const key of [
		"nonGoals",
		"piEvents",
		"commands",
		"tools",
		"capabilities",
	]) {
		if (!Array.isArray(record[key])) errors.push(`${key} must be an array`);
	}
	if (
		typeof record["sideEffects"] !== "object" ||
		record["sideEffects"] === null
	) {
		errors.push("sideEffects must be an object");
	} else {
		const sideEffects = record["sideEffects"] as Record<string, unknown>;
		for (const key of ["filesystem", "network", "process", "credentials"]) {
			if (!Array.isArray(sideEffects[key]))
				errors.push(`sideEffects.${key} must be an array`);
		}
	}
	return errors;
}

function extensionWarnings(
	entrypoints: ExtensionEntrypointReport[],
	manifest: ExtensionInspectReport["manifest"],
	inferred: ExtensionInspectReport["inferred"],
): string[] {
	const warnings: string[] = [];
	if (entrypoints.length === 0) warnings.push("no extension entrypoint found");
	if (!manifest.present) warnings.push("no Olympus extension manifest found");
	for (const error of manifest.errors) warnings.push(error);
	for (const tool of inferred.tools) {
		if (["bash", "read", "write", "edit"].includes(tool))
			warnings.push(`tool override risk: ${tool}`);
	}
	return warnings;
}

function skeletonFiles(name: string): SkeletonFile[] {
	const manifest = generatedManifest(name);
	return [
		{
			relativePath: "package.json",
			content: `${JSON.stringify({ name, version: "0.0.0", type: "module", private: true, pi: { extensions: ["src/index.ts"] } }, null, 2)}\n`,
		},
		{
			relativePath: "src/index.ts",
			content: generatedIndex(name),
		},
		{
			relativePath: "README.md",
			content: generatedReadme(name),
		},
		{
			relativePath: "olympus-extension.json",
			content: `${JSON.stringify(manifest, null, 2)}\n`,
		},
		{
			relativePath: "test/fixtures/.gitkeep",
			content: "",
		},
	];
}

function generatedManifest(name: string): OlympusExtensionManifest {
	return {
		schemaVersion: 1,
		olympusOwned: true,
		name,
		purpose:
			"Describe the first-party Pi extension purpose before enabling it.",
		nonGoals: [
			"Does not execute third-party package code",
			"Does not bypass Olympus trust or sandbox policy",
		],
		piEvents: ["command"],
		commands: [`/olympus-${name}`],
		tools: [],
		sideEffects: {
			filesystem: [
				"read project-local Olympus state only until changed by the author",
			],
			network: [],
			process: [],
			credentials: [],
		},
		capabilities: ["project-state-read"],
		verification: "bun run olympus:test",
		uninstall:
			"Remove this generated extension directory and its manifest-owned settings entry when install support exists.",
	};
}

function generatedIndex(name: string): string {
	return `// Generated by Olympus. Review olympus-extension.json before enabling this Pi extension.\nexport const olympusExtension = {\n\tname: ${JSON.stringify(name)},\n\tcommands: [${JSON.stringify(`/olympus-${name}`)}],\n\tevents: ["command"],\n\tactivate() {\n\t\treturn {\n\t\t\tstatus: "inspect-only",\n\t\t\tmessage: "Olympus-generated extension skeleton; implement Pi bindings after reviewing declared capabilities.",\n\t\t};\n\t},\n};\n`;
}

function generatedReadme(name: string): string {
	return `# ${name}\n\nOlympus-generated first-party Pi extension skeleton.\n\n## Purpose\n\nDescribe the extension purpose before enabling it.\n\n## Safety\n\n- Does not execute third-party package code by default.\n- Must not bypass Olympus trust, manifest, or sandbox policy.\n- Update \`olympus-extension.json\` when adding commands, tools, events, or side effects.\n\n## Verification\n\nRun the verification command declared in \`olympus-extension.json\`.\n\n## Disable/uninstall\n\nRemove this directory and any future manifest-owned settings entry.\n`;
}

function uniqueMatches(sourceText: string, ...patterns: RegExp[]): string[] {
	const values = new Set<string>();
	for (const pattern of patterns) {
		pattern.lastIndex = 0;
		let match = pattern.exec(sourceText);
		while (match !== null) {
			const value = match[1];
			if (value !== undefined && value.trim().length > 0)
				values.add(value.trim());
			match = pattern.exec(sourceText);
		}
	}
	return [...values].sort();
}

function formatCommand(command: string): string {
	return command.startsWith("/") ? command : `/${command}`;
}
