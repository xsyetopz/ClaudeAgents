import {
	mkdir,
	readdir,
	readFile,
	rm,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { evaluateLocalPackage } from "./evaluation";
import { directoryExists, hashFile } from "./hashing";
import {
	appendAuditEvent,
	hashJson,
	type ManifestFileRecord,
	type ManifestPackageRecord,
	readManifest,
	relativeToProject,
	writeManifest,
} from "./manifest";
import {
	type PiPackageSettingsEntry,
	readPiSettings,
	removePackageEntry,
	upsertPackageEntry,
	writePiSettings,
} from "./settings";
import type {
	EvaluationReport,
	InspectionReport,
	ResourceReport,
} from "./types";

const LEADING_SCOPE_PATTERN = /^@/;
const PACKAGE_ID_UNSAFE_PATTERN = /[^a-z0-9-]+/g;
const PACKAGE_ID_EDGE_DASH_PATTERN = /^-+|-+$/g;

export interface InstallReport {
	schemaVersion: 1;
	command: "install";
	packageId: string;
	source: string;
	projectRoot: string;
	project: true;
	apply: boolean;
	blocked: boolean;
	decision: EvaluationReport["decision"];
	wouldWrite: string[];
	written: string[];
	settingsEntry: PiPackageSettingsEntry;
	reason: string;
	warnings: string[];
}

export interface UninstallReport {
	schemaVersion: 1;
	command: "uninstall";
	packageId: string;
	projectRoot: string;
	project: true;
	apply: boolean;
	blocked: boolean;
	wouldRead: string[];
	wouldRemove: string[];
	removed: string[];
	preserved: string[];
	reason: string;
	warnings: string[];
}

interface InstallOptions {
	source: string;
	projectRoot?: string;
	apply: boolean;
}

interface UninstallOptions {
	packageId: string;
	projectRoot?: string;
	apply: boolean;
}

interface InstallPlan {
	report: InstallReport;
	evaluation: EvaluationReport;
	mirrorRoot: string;
	settingsEntryHash: string;
	resources: ResourceReport[];
	filesToCopy: Array<{ sourcePath: string; targetPath: string }>;
}

const PASSIVE_KINDS = new Set(["skill", "prompt", "theme"]);

export async function planPassiveInstall(
	options: InstallOptions,
): Promise<InstallReport> {
	return (await buildInstallPlan(options)).report;
}

export async function applyPassiveInstall(
	options: InstallOptions,
): Promise<InstallReport> {
	if (!options.apply) return planPassiveInstall(options);
	const plan = await buildInstallPlan(options);
	if (plan.report.blocked) return plan.report;
	await writePassiveMirror(plan);
	const settings = await readPiSettings(plan.report.projectRoot);
	await writePiSettings(
		plan.report.projectRoot,
		upsertPackageEntry(settings, plan.report.settingsEntry),
	);
	const files = await manifestFilesForPackage(
		plan.report.projectRoot,
		plan.mirrorRoot,
	);
	files.push({
		path: relativeToProject(
			plan.report.projectRoot,
			path.join(plan.report.projectRoot, ".pi", "settings.json"),
		),
		hash: await hashFile(
			path.join(plan.report.projectRoot, ".pi", "settings.json"),
		),
	});
	const manifest = await readManifest(plan.report.projectRoot);
	const packageRecord: ManifestPackageRecord = {
		packageId: plan.report.packageId,
		installedAt: new Date().toISOString(),
		source: plan.evaluation.inspection.package.source,
		package: plan.evaluation.inspection.package,
		mirrorRoot: relativeToProject(plan.report.projectRoot, plan.mirrorRoot),
		settingsSource: plan.report.settingsEntry.source,
		settingsEntryHash: plan.settingsEntryHash,
		resources: plan.resources.map((resource) => ({
			id: resource.id,
			kind: resource.kind,
			path: resource.path,
			hash: resource.hash,
		})),
		files,
	};
	await writeManifest(plan.report.projectRoot, {
		schemaVersion: 1,
		packages: [
			...manifest.packages.filter(
				(record) => record.packageId !== plan.report.packageId,
			),
			packageRecord,
		],
	});
	await appendAuditEvent(plan.report.projectRoot, {
		event: "install",
		packageId: plan.report.packageId,
		source: plan.evaluation.inspection.package.source,
		ok: true,
		detail: "installed passive package mirror with manifest ownership",
	});
	return {
		...plan.report,
		apply: true,
		written: packageRecord.files.map((file) => file.path),
		reason:
			"installed passive resources into an Olympus-owned project-local Pi package mirror",
	};
}

export function planManifestUninstall(
	options: UninstallOptions,
): Promise<UninstallReport> {
	return buildUninstallReport(options);
}

export async function applyManifestUninstall(
	options: UninstallOptions,
): Promise<UninstallReport> {
	if (!options.apply) return planManifestUninstall(options);
	const report = await buildUninstallReport(options);
	if (report.blocked) return report;
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const manifest = await readManifest(projectRoot);
	const record = manifest.packages.find(
		(packageRecord) => packageRecord.packageId === options.packageId,
	);
	if (record === undefined) return report;
	const settings = await readPiSettings(projectRoot);
	const currentSettingsEntry = (settings.packages ?? []).find(
		(entry) => entry.source === record.settingsSource,
	);
	const removed: string[] = [];
	const preserved: string[] = [];
	const warnings = [...report.warnings];
	if (
		currentSettingsEntry !== undefined &&
		hashJson(currentSettingsEntry) === record.settingsEntryHash
	) {
		await writePiSettings(
			projectRoot,
			removePackageEntry(settings, record.settingsSource),
		);
		removed.push(".pi/settings.json packages entry");
	} else if (currentSettingsEntry !== undefined) {
		preserved.push(".pi/settings.json packages entry");
		warnings.push(
			"settings package entry changed; preserving user-modified entry",
		);
	}
	for (const file of record.files.filter(
		(fileRecord) => fileRecord.path !== ".pi/settings.json",
	)) {
		const fullPath = path.join(projectRoot, file.path);
		try {
			const currentHash = await hashFile(fullPath);
			if (currentHash !== file.hash) {
				preserved.push(file.path);
				warnings.push(`hash mismatch; preserved ${file.path}`);
				continue;
			}
			await unlink(fullPath);
			removed.push(file.path);
		} catch (error) {
			if (isNotFound(error)) continue;
			throw error;
		}
	}
	await removeEmptyDirectories(path.join(projectRoot, record.mirrorRoot));
	await writeManifest(projectRoot, {
		schemaVersion: 1,
		packages: manifest.packages.filter(
			(packageRecord) => packageRecord.packageId !== options.packageId,
		),
	});
	await appendAuditEvent(projectRoot, {
		event: "uninstall",
		packageId: options.packageId,
		ok: preserved.length === 0,
		detail:
			preserved.length === 0
				? "removed manifest-owned package mirror"
				: "partial uninstall; user-modified files were preserved",
	});
	return {
		...report,
		apply: true,
		removed,
		preserved,
		warnings,
		reason:
			preserved.length === 0
				? "removed manifest-owned package mirror and settings entry"
				: "partial uninstall; preserved changed files for manual cleanup",
	};
}

async function buildInstallPlan(options: InstallOptions): Promise<InstallPlan> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const evaluation = await evaluateLocalPackage(options.source);
	const inspection = evaluation.inspection;
	const packageId = packageIdForInspection(inspection);
	const mirrorRoot = path.join(
		projectRoot,
		".pi",
		"olympus",
		"packages",
		packageId,
		"package",
	);
	const resources = inspection.resources.filter((resource) => resource.passive);
	const settingsEntry = settingsEntryForResources(packageId, resources);
	const settingsEntryHash = hashJson(settingsEntry);
	const filesToCopy = filesToMirror(inspection, resources, mirrorRoot);
	const wouldWrite = [
		".pi/settings.json packages entry",
		".pi/olympus/olympus-manifest.json",
		".pi/olympus/audit.jsonl",
		...filesToCopy.map((file) =>
			relativeToProject(projectRoot, file.targetPath),
		),
		relativeToProject(projectRoot, path.join(mirrorRoot, "package.json")),
	];
	const blockReason = installBlockReason(evaluation);
	return {
		report: {
			schemaVersion: 1,
			command: "install",
			packageId,
			source: options.source,
			projectRoot,
			project: true,
			apply: options.apply,
			blocked: blockReason !== undefined,
			decision: evaluation.decision,
			wouldWrite: wouldWrite.sort(),
			written: [],
			settingsEntry,
			reason:
				blockReason ??
				(options.apply
					? "ready to install passive resources into an Olympus-owned project-local Pi package mirror"
					: "dry-run plan for passive resource install; rerun with --apply to write project-local Olympus-owned files"),
			warnings: [...inspection.warnings, ...evaluation.conflicts],
		},
		evaluation,
		mirrorRoot,
		settingsEntryHash,
		resources,
		filesToCopy,
	};
}

function installBlockReason(evaluation: EvaluationReport): string | undefined {
	if (evaluation.inspection.executables.length > 0) {
		return "install blocked: executable resources require future trust and sandbox gates";
	}
	if (evaluation.decision !== "trust-passive") {
		return "install blocked: package evaluation did not reach trust-passive";
	}
	return undefined;
}

function settingsEntryForResources(
	packageId: string,
	resources: ResourceReport[],
): PiPackageSettingsEntry {
	return {
		source: `./olympus/packages/${packageId}/package`,
		extensions: [],
		skills: filterPaths(resources, "skill"),
		prompts: filterPaths(resources, "prompt"),
		themes: filterPaths(resources, "theme"),
	};
}

function filterPaths(
	resources: ResourceReport[],
	kind: ResourceReport["kind"],
): string[] {
	return resources
		.filter((resource) => resource.kind === kind)
		.map((resource) => `+${resource.path}`)
		.sort();
}

function filesToMirror(
	inspection: InspectionReport,
	resources: ResourceReport[],
	mirrorRoot: string,
): Array<{ sourcePath: string; targetPath: string }> {
	const files = new Map<string, { sourcePath: string; targetPath: string }>();
	for (const resource of resources) {
		if (!PASSIVE_KINDS.has(resource.kind)) continue;
		files.set(resource.path, {
			sourcePath: path.join(inspection.package.source, resource.path),
			targetPath: path.join(mirrorRoot, resource.path),
		});
		for (const supportFile of resource.supportFiles) {
			files.set(supportFile.path, {
				sourcePath: path.join(inspection.package.source, supportFile.path),
				targetPath: path.join(mirrorRoot, supportFile.path),
			});
		}
	}
	return [...files.values()].sort((left, right) =>
		left.targetPath.localeCompare(right.targetPath),
	);
}

async function writePassiveMirror(plan: InstallPlan): Promise<void> {
	await rm(plan.mirrorRoot, { recursive: true, force: true });
	for (const file of plan.filesToCopy) {
		await mkdir(path.dirname(file.targetPath), { recursive: true });
		await writeFile(file.targetPath, await readFile(file.sourcePath));
	}
	const packageJson = {
		name: `olympus-mirror-${plan.report.packageId}`,
		version: plan.evaluation.inspection.package.version,
		private: true,
		pi: {
			extensions: [],
			skills: plan.report.settingsEntry.skills.map(stripPlus),
			prompts: plan.report.settingsEntry.prompts.map(stripPlus),
			themes: plan.report.settingsEntry.themes.map(stripPlus),
		},
	};
	await writeFile(
		path.join(plan.mirrorRoot, "package.json"),
		`${JSON.stringify(packageJson, null, 2)}\n`,
	);
}

async function manifestFilesForPackage(
	projectRoot: string,
	mirrorRoot: string,
): Promise<ManifestFileRecord[]> {
	const files: ManifestFileRecord[] = [];
	await collectFiles(projectRoot, mirrorRoot, files);
	return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function collectFiles(
	projectRoot: string,
	currentPath: string,
	files: ManifestFileRecord[],
): Promise<void> {
	const entries = await readdir(currentPath, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(currentPath, entry.name);
		if (entry.isDirectory()) {
			await collectFiles(projectRoot, entryPath, files);
			continue;
		}
		if (!entry.isFile()) continue;
		files.push({
			path: relativeToProject(projectRoot, entryPath),
			hash: await hashFile(entryPath),
		});
	}
}

async function buildUninstallReport(
	options: UninstallOptions,
): Promise<UninstallReport> {
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const manifest = await readManifest(projectRoot);
	const record = manifest.packages.find(
		(packageRecord) => packageRecord.packageId === options.packageId,
	);
	if (record === undefined) {
		return {
			schemaVersion: 1,
			command: "uninstall",
			packageId: options.packageId,
			projectRoot,
			project: true,
			apply: options.apply,
			blocked: true,
			wouldRead: [".pi/olympus/olympus-manifest.json"],
			wouldRemove: [],
			removed: [],
			preserved: [],
			reason:
				"uninstall blocked: package id is not present in the Olympus manifest",
			warnings: [],
		};
	}
	return {
		schemaVersion: 1,
		command: "uninstall",
		packageId: options.packageId,
		projectRoot,
		project: true,
		apply: options.apply,
		blocked: false,
		wouldRead: [".pi/olympus/olympus-manifest.json", ".pi/settings.json"],
		wouldRemove: [
			".pi/settings.json packages entry",
			...record.files
				.filter((file) => file.path !== ".pi/settings.json")
				.map((file) => file.path),
		],
		removed: [],
		preserved: [],
		reason: options.apply
			? "ready to remove only manifest-owned files with matching hashes"
			: "dry-run uninstall plan from Olympus manifest authority; rerun with --apply to remove matching files",
		warnings: [],
	};
}

async function removeEmptyDirectories(directoryPath: string): Promise<void> {
	if (!(await directoryExists(directoryPath))) return;
	const entries = await readdir(directoryPath);
	if (entries.length > 0) return;
	await rm(directoryPath, { recursive: true, force: true });
	await removeEmptyDirectories(path.dirname(directoryPath));
}

function packageIdForInspection(inspection: InspectionReport): string {
	const raw = `${inspection.package.name}-${inspection.package.version}-${inspection.package.contentDigest.slice(7, 19)}`;
	return raw
		.toLowerCase()
		.replace(LEADING_SCOPE_PATTERN, "")
		.replace(PACKAGE_ID_UNSAFE_PATTERN, "-")
		.replace(PACKAGE_ID_EDGE_DASH_PATTERN, "")
		.slice(0, 96);
}

function stripPlus(value: string): string {
	return value.startsWith("+") ? value.slice(1) : value;
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
