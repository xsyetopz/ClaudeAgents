import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { OlympusError } from "./types";

export interface PiPackageSettingsEntry {
	source: string;
	extensions: string[];
	skills: string[];
	prompts: string[];
	themes: string[];
}

export interface PiSettingsFile {
	[key: string]: unknown;
	packages?: PiPackageSettingsEntry[];
}

export function settingsPath(projectRoot: string): string {
	return path.join(projectRoot, ".pi", "settings.json");
}

export async function readPiSettings(
	projectRoot: string,
): Promise<PiSettingsFile> {
	try {
		const parsed = JSON.parse(
			await readFile(settingsPath(projectRoot), "utf8"),
		) as unknown;
		if (typeof parsed !== "object" || parsed === null) {
			throw new OlympusError(".pi/settings.json must be an object", 2);
		}
		const settings = parsed as PiSettingsFile;
		if (settings.packages !== undefined && !Array.isArray(settings.packages)) {
			throw new OlympusError(".pi/settings.json packages must be an array", 2);
		}
		return settings;
	} catch (error) {
		if (isNotFound(error)) return {};
		if (error instanceof SyntaxError) {
			throw new OlympusError(
				`.pi/settings.json is malformed: ${error.message}`,
				2,
			);
		}
		throw error;
	}
}

export async function writePiSettings(
	projectRoot: string,
	settings: PiSettingsFile,
): Promise<void> {
	await mkdir(path.dirname(settingsPath(projectRoot)), { recursive: true });
	await writeFile(
		settingsPath(projectRoot),
		`${JSON.stringify(settings, null, 2)}\n`,
	);
}

export function upsertPackageEntry(
	settings: PiSettingsFile,
	entry: PiPackageSettingsEntry,
): PiSettingsFile {
	const packages = settings.packages ?? [];
	return {
		...settings,
		packages: [
			...packages.filter((existing) => existing.source !== entry.source),
			entry,
		],
	};
}

export function removePackageEntry(
	settings: PiSettingsFile,
	source: string,
): PiSettingsFile {
	const packages = settings.packages ?? [];
	return {
		...settings,
		packages: packages.filter((entry) => entry.source !== source),
	};
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
