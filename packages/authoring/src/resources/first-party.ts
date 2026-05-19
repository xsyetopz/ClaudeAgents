import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	appendAuditEvent,
	hashFile,
	hashJson,
	type ManifestFileRecord,
	type PiPackageSettingsEntry,
	readLock,
	readManifest,
	readPiSettings,
	relativeToProject,
	toPosix,
	upsertPackageEntry,
	writeLock,
	writeManifest,
	writePiSettings,
} from "lifecycle";
import { stablePrettyJson } from "reporting";
import { FIRST_PARTY_RESOURCE_METADATA } from "./schema.js";

export interface FirstPartyPackagePlan {
	schemaVersion: 1;
	command: "resources package";
	apply: boolean;
	manifestReady: true;
	blocked: boolean;
	wouldWrite: string[];
	written: string[];
	resources: number;
}

export interface FirstPartyResourceInstallReport {
	schemaVersion: 1;
	command: "resources install";
	projectRoot: string;
	project: true;
	apply: boolean;
	packageId: "olympus-first-party-resources";
	blocked: false;
	wouldWrite: string[];
	written: string[];
	settingsEntry: PiPackageSettingsEntry;
	reason: string;
	warnings: string[];
}

export async function writeFirstPartyResourcePackage(
	outputDirectory: string,
	apply: boolean,
): Promise<FirstPartyPackagePlan> {
	const files = packageFiles();
	const root = path.resolve(outputDirectory);
	const writePaths = files.map((file) =>
		toPosix(path.join(root, file.relativePath)),
	);
	if (!apply) {
		return {
			schemaVersion: 1,
			command: "resources package",
			apply,
			manifestReady: true,
			blocked: false,
			wouldWrite: writePaths,
			written: [],
			resources: FIRST_PARTY_RESOURCE_METADATA.length,
		};
	}
	for (const file of files) {
		const target = path.join(root, file.relativePath);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, file.content);
	}
	return {
		schemaVersion: 1,
		command: "resources package",
		apply,
		manifestReady: true,
		blocked: false,
		wouldWrite: [],
		written: writePaths,
		resources: FIRST_PARTY_RESOURCE_METADATA.length,
	};
}

export async function installFirstPartyResources(options: {
	projectRoot?: string;
	apply: boolean;
}): Promise<FirstPartyResourceInstallReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const packageId = "olympus-first-party-resources" as const;
	const mirrorRoot = path.join(
		projectRoot,
		".pi",
		"olympus",
		"first-party-resources",
		"package",
	);
	const settingsEntry: PiPackageSettingsEntry = {
		source: "./olympus/first-party-resources/package",
		extensions: [],
		skills: ["+resources/skills"],
		prompts: ["+resources/prompts"],
		themes: [],
	};
	const generated = packageFiles();
	const wouldWrite = [
		".pi/settings.json packages entry",
		".pi/olympus/olympus-manifest.json",
		".pi/olympus/olympus.lock",
		".pi/olympus/audit.jsonl",
		...generated.map((file) =>
			relativeToProject(projectRoot, path.join(mirrorRoot, file.relativePath)),
		),
	].sort();
	if (!options.apply) {
		return {
			schemaVersion: 1,
			command: "resources install",
			projectRoot,
			project: true,
			apply: false,
			packageId,
			blocked: false,
			wouldWrite,
			written: [],
			settingsEntry,
			reason:
				"dry-run plan for first-party Olympus resource install; rerun with --apply to write project-local .pi files",
			warnings: [],
		};
	}
	for (const file of generated) {
		const target = path.join(mirrorRoot, file.relativePath);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, file.content);
	}
	await writePiSettings(
		projectRoot,
		upsertPackageEntry(await readPiSettings(projectRoot), settingsEntry),
	);
	const files = await listManifestFiles(projectRoot, mirrorRoot);
	files.push({
		path: ".pi/settings.json",
		hash: await hashFile(path.join(projectRoot, ".pi", "settings.json")),
	});
	const contentDigest = contentHash(
		generated.map((file) => file.content).join("\n---\n"),
	);
	const manifest = await readManifest(projectRoot);
	await writeManifest(projectRoot, {
		schemaVersion: 1,
		packages: [
			...manifest.packages.filter((record) => record.packageId !== packageId),
			{
				packageId,
				installedAt: new Date().toISOString(),
				source: "first-party:olympus",
				package: {
					name: packageId,
					version: "0.1.0",
					sourceType: "local",
					source: "first-party:olympus",
					contentDigest,
				},
				mirrorRoot: relativeToProject(projectRoot, mirrorRoot),
				settingsSource: settingsEntry.source,
				settingsEntryHash: hashJson(settingsEntry),
				resources: FIRST_PARTY_RESOURCE_METADATA.map((resource) => ({
					id: `${resource.resourceKind}:${resource.name}`,
					kind:
						resource.resourceKind === "command"
							? "prompt"
							: resource.resourceKind,
					path: resource.supportFiles[0]?.path ?? resource.name,
					hash: contentDigest,
				})),
				files,
			},
		],
	});
	const lock = await readLock(projectRoot);
	await writeLock(projectRoot, {
		schemaVersion: 1,
		packages: [
			...lock.packages.filter((record) => record.packageId !== packageId),
			{ packageId, contentDigest, decision: "trusted-passive" },
		],
	});
	await appendAuditEvent(projectRoot, {
		event: "resources-install",
		packageId,
		source: "first-party:olympus",
		ok: true,
		detail: "installed first-party Olympus resources project-locally",
	});
	return {
		schemaVersion: 1,
		command: "resources install",
		projectRoot,
		project: true,
		apply: true,
		packageId,
		blocked: false,
		wouldWrite: [],
		written: wouldWrite,
		settingsEntry,
		reason:
			"installed first-party Olympus resources into project-local .pi paths",
		warnings: [],
	};
}

function packageFiles(): Array<{ relativePath: string; content: string }> {
	const files: Array<{ relativePath: string; content: string }> = [
		{
			relativePath: "olympus-resources.json",
			content: stablePrettyJson({
				schemaVersion: 1,
				resources: FIRST_PARTY_RESOURCE_METADATA,
			}),
		},
	];
	for (const resource of FIRST_PARTY_RESOURCE_METADATA) {
		const body = `# ${resource.name}\n\n${resource.description}\n\nCommands: ${resource.commands.join(", ")}\n`;
		for (const support of resource.supportFiles) {
			files.push({ relativePath: support.path, content: body });
		}
	}
	return files.map((file) => ({
		...file,
		content: file.content.endsWith("\n") ? file.content : `${file.content}\n`,
	}));
}

async function listManifestFiles(
	projectRoot: string,
	root: string,
): Promise<ManifestFileRecord[]> {
	const files: ManifestFileRecord[] = [];
	await walk(root, async (filePath) => {
		files.push({
			path: relativeToProject(projectRoot, filePath),
			hash: await hashFile(filePath),
		});
	});
	return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function walk(
	directory: string,
	onFile: (filePath: string) => Promise<void>,
): Promise<void> {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) await walk(fullPath, onFile);
		else if (entry.isFile()) await onFile(fullPath);
	}
}

export function contentHash(text: string): string {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}
