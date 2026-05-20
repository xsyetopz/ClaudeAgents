import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { olympiDirectory } from "./manifest.js";

export interface OlympiProfile {
	schemaVersion: 1;
	name: string;
	description: string;
	providerRendererCompatibility: false;
	globalPiWrites: false;
	createdAt: string;
}

export interface ProfileStatusReport {
	schemaVersion: 1;
	command: "profile status";
	projectRoot: string;
	path: ".pi/olympi/profile.json";
	profile: OlympiProfile | null;
	warnings: string[];
}

export interface ProfileSetReport {
	schemaVersion: 1;
	command: "profile set";
	projectRoot: string;
	path: ".pi/olympi/profile.json";
	apply: boolean;
	wouldWrite: string[];
	written: string[];
	profile: OlympiProfile;
	reason: string;
}

export async function readProfileStatus(
	projectRoot: string = process.cwd(),
): Promise<ProfileStatusReport> {
	const root = path.resolve(projectRoot);
	return {
		schemaVersion: 1,
		command: "profile status",
		projectRoot: root,
		path: ".pi/olympi/profile.json",
		profile: await readProfile(root),
		warnings: [],
	};
}

export async function setProjectProfile(options: {
	projectRoot?: string;
	name: string;
	description?: string;
	apply: boolean;
}): Promise<ProfileSetReport> {
	const root = path.resolve(options.projectRoot ?? process.cwd());
	const profile: OlympiProfile = {
		schemaVersion: 1,
		name: sanitizeProfileName(options.name),
		description: options.description ?? "Project-local Olympi profile",
		providerRendererCompatibility: false,
		globalPiWrites: false,
		createdAt: new Date().toISOString(),
	};
	const writePath = ".pi/olympi/profile.json";
	if (options.apply) {
		await mkdir(olympiDirectory(root), { recursive: true });
		await writeFile(
			path.join(root, writePath),
			`${JSON.stringify(profile, null, 2)}\n`,
		);
	}
	return {
		schemaVersion: 1,
		command: "profile set",
		projectRoot: root,
		path: writePath,
		apply: options.apply,
		wouldWrite: options.apply ? [] : [writePath],
		written: options.apply ? [writePath] : [],
		profile,
		reason: options.apply
			? "wrote project-local Olympi profile without provider-renderer profile writes"
			: "dry-run profile plan; rerun with --apply to write project-local Olympi profile",
	};
}

async function readProfile(projectRoot: string): Promise<OlympiProfile | null> {
	try {
		const parsed = JSON.parse(
			await readFile(
				path.join(projectRoot, ".pi", "olympi", "profile.json"),
				"utf8",
			),
		) as unknown;
		return typeof parsed === "object" && parsed !== null
			? (parsed as OlympiProfile)
			: null;
	} catch (error) {
		if (isNotFound(error)) return null;
		throw error;
	}
}

function sanitizeProfileName(value: string): string {
	const sanitized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-");
	return sanitized.length === 0 ? "default" : sanitized;
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
