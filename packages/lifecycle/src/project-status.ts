import { readFile } from "node:fs/promises";
import path from "node:path";
import { hashFile } from "./hashing.js";
import { readLock } from "./lock.js";
import { auditPath, hashJson, readManifest } from "./manifest.js";
import { readPiSettings } from "./settings.js";

export interface ProjectPackageStatus {
	packageId: string;
	source: string;
	resourceCount: number;
	fileCount: number;
	settingsEntryPresent: boolean;
	settingsEntryHashMatches: boolean;
	fileHashMismatches: string[];
	missingFiles: string[];
	lockDigestMatches: boolean | "no-lock-record";
}

export interface OlympiProjectStatus {
	schemaVersion: 1;
	command: "status";
	projectRoot: string;
	paths: {
		settings: string;
		manifest: string;
		lock: string;
		audit: string;
	};
	manifestPackages: number;
	lockRecords: number;
	auditEvents: number;
	packages: ProjectPackageStatus[];
	warnings: string[];
}

export async function readProjectStatus(
	projectRoot: string = process.cwd(),
): Promise<OlympiProjectStatus> {
	const root = path.resolve(projectRoot);
	const manifest = await readManifest(root);
	const lock = await readLock(root);
	const settings = await readPiSettings(root);
	const packages: ProjectPackageStatus[] = [];
	const warnings: string[] = [];
	for (const packageRecord of manifest.packages) {
		const settingsEntry = (settings.packages ?? []).find(
			(entry) => entry.source === packageRecord.settingsSource,
		);
		const fileHashMismatches: string[] = [];
		const missingFiles: string[] = [];
		for (const file of packageRecord.files) {
			if (file.path === ".pi/settings.json") continue;
			try {
				const currentHash = await hashFile(path.join(root, file.path));
				if (currentHash !== file.hash) fileHashMismatches.push(file.path);
			} catch (error) {
				if (isNotFound(error)) {
					missingFiles.push(file.path);
					continue;
				}
				throw error;
			}
		}
		const lockRecord = lock.packages.find(
			(record) => record.packageId === packageRecord.packageId,
		);
		const status: ProjectPackageStatus = {
			packageId: packageRecord.packageId,
			source: packageRecord.source,
			resourceCount: packageRecord.resources.length,
			fileCount: packageRecord.files.length,
			settingsEntryPresent: settingsEntry !== undefined,
			settingsEntryHashMatches:
				settingsEntry !== undefined &&
				hashJson(settingsEntry) === packageRecord.settingsEntryHash,
			fileHashMismatches,
			missingFiles,
			lockDigestMatches:
				lockRecord === undefined
					? "no-lock-record"
					: lockRecord.contentDigest === packageRecord.package.contentDigest,
		};
		packages.push(status);
		if (!status.settingsEntryPresent) {
			warnings.push(`settings entry missing for ${status.packageId}`);
		} else if (!status.settingsEntryHashMatches) {
			warnings.push(`settings entry changed for ${status.packageId}`);
		}
		for (const filePath of status.fileHashMismatches) {
			warnings.push(`hash mismatch for ${status.packageId}: ${filePath}`);
		}
		for (const filePath of status.missingFiles) {
			warnings.push(
				`manifest file missing for ${status.packageId}: ${filePath}`,
			);
		}
		if (status.lockDigestMatches === false) {
			warnings.push(`lock digest mismatch for ${status.packageId}`);
		}
	}
	return {
		schemaVersion: 1,
		command: "status",
		projectRoot: root,
		paths: {
			settings: ".pi/settings.json",
			manifest: ".pi/olympi/olympi-manifest.json",
			lock: ".pi/olympi/olympi.lock",
			audit: ".pi/olympi/audit.jsonl",
		},
		manifestPackages: manifest.packages.length,
		lockRecords: lock.packages.length,
		auditEvents: await countAuditEvents(root),
		packages,
		warnings,
	};
}

export function formatProjectStatus(status: OlympiProjectStatus): string {
	const lines = [
		"Olympi project status",
		`Project: ${status.projectRoot}`,
		`Manifest packages: ${status.manifestPackages}`,
		`Lock records: ${status.lockRecords}`,
		`Audit events: ${status.auditEvents}`,
	];
	for (const packageStatus of status.packages) {
		lines.push(`- ${packageStatus.packageId}`);
		lines.push(`  resources: ${packageStatus.resourceCount}`);
		lines.push(`  files: ${packageStatus.fileCount}`);
		lines.push(
			`  settings entry: ${packageStatus.settingsEntryPresent ? "present" : "missing"}`,
		);
		lines.push(
			`  settings hash: ${packageStatus.settingsEntryHashMatches ? "match" : "changed-or-missing"}`,
		);
		lines.push(`  lock digest: ${packageStatus.lockDigestMatches}`);
	}
	for (const warning of status.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

async function countAuditEvents(projectRoot: string): Promise<number> {
	try {
		const text = await readFile(auditPath(projectRoot), "utf8");
		return text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0).length;
	} catch (error) {
		if (isNotFound(error)) return 0;
		throw error;
	}
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
