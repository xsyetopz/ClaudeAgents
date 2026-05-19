import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { toPosix } from "./hashing.js";
import type { PackageIdentity, ResourceReport } from "./types.js";

export interface ManifestFileRecord {
	path: string;
	hash: string;
}

export interface ManifestPackageRecord {
	packageId: string;
	installedAt: string;
	source: string;
	package: PackageIdentity;
	mirrorRoot: string;
	settingsSource: string;
	settingsEntryHash: string;
	resources: Pick<ResourceReport, "id" | "kind" | "path" | "hash">[];
	files: ManifestFileRecord[];
}

export interface OlympiManifest {
	schemaVersion: 1;
	packages: ManifestPackageRecord[];
}

export interface AuditEvent {
	schemaVersion: 1;
	event: string;
	packageId?: string;
	source?: string;
	ok: boolean;
	detail: string;
	timestamp: string;
}

export function olympiDirectory(projectRoot: string): string {
	return path.join(projectRoot, ".pi", "olympi");
}

export function manifestPath(projectRoot: string): string {
	return path.join(olympiDirectory(projectRoot), "olympi-manifest.json");
}

export function auditPath(projectRoot: string): string {
	return path.join(olympiDirectory(projectRoot), "audit.jsonl");
}

export function lockPath(projectRoot: string): string {
	return path.join(olympiDirectory(projectRoot), "olympi.lock");
}

export async function readManifest(
	projectRoot: string,
): Promise<OlympiManifest> {
	try {
		const parsed = JSON.parse(
			await readFile(manifestPath(projectRoot), "utf8"),
		) as unknown;
		return normalizeManifest(parsed);
	} catch (error) {
		if (isNotFound(error)) return emptyManifest();
		throw error;
	}
}

export async function writeManifest(
	projectRoot: string,
	manifest: OlympiManifest,
): Promise<void> {
	await mkdir(olympiDirectory(projectRoot), { recursive: true });
	await writeFile(
		manifestPath(projectRoot),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
}

export async function appendAuditEvent(
	projectRoot: string,
	event: Omit<AuditEvent, "schemaVersion" | "timestamp">,
): Promise<void> {
	await mkdir(olympiDirectory(projectRoot), { recursive: true });
	const record: AuditEvent = {
		schemaVersion: 1,
		timestamp: new Date().toISOString(),
		...event,
	};
	await writeFile(auditPath(projectRoot), `${JSON.stringify(record)}\n`, {
		flag: "a",
	});
}

export function hashJson(value: unknown): string {
	return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function canonicalJson(value: unknown): string {
	return JSON.stringify(sortJson(value));
}

export function relativeToProject(
	projectRoot: string,
	filePath: string,
): string {
	return toPosix(path.relative(projectRoot, filePath));
}

function emptyManifest(): OlympiManifest {
	return { schemaVersion: 1, packages: [] };
}

function normalizeManifest(value: unknown): OlympiManifest {
	if (typeof value !== "object" || value === null) return emptyManifest();
	const record = value as Record<string, unknown>;
	if (record["schemaVersion"] !== 1 || !Array.isArray(record["packages"])) {
		return emptyManifest();
	}
	return value as OlympiManifest;
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}

function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((entry) => sortJson(entry));
	if (typeof value !== "object" || value === null) return value;
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		result[key] = sortJson((value as Record<string, unknown>)[key]);
	}
	return result;
}
