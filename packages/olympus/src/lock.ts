import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { lockPath } from "./manifest";

export interface LockPackageRecord {
	packageId: string;
	contentDigest: string;
	decision: "trusted-passive" | "revoked";
}

export interface OlympusLock {
	schemaVersion: 1;
	packages: LockPackageRecord[];
}

export async function readLock(projectRoot: string): Promise<OlympusLock> {
	try {
		const parsed = JSON.parse(
			await readFile(lockPath(projectRoot), "utf8"),
		) as unknown;
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			(parsed as { schemaVersion?: unknown }).schemaVersion === 1 &&
			Array.isArray((parsed as { packages?: unknown }).packages)
		) {
			return parsed as OlympusLock;
		}
		return { schemaVersion: 1, packages: [] };
	} catch (error) {
		if (isNotFound(error)) return { schemaVersion: 1, packages: [] };
		throw error;
	}
}

export async function writeLock(
	projectRoot: string,
	lock: OlympusLock,
): Promise<void> {
	await mkdir(path.dirname(lockPath(projectRoot)), { recursive: true });
	await writeFile(lockPath(projectRoot), `${JSON.stringify(lock, null, 2)}\n`);
}

export function hasLockDigestMismatch(
	lock: OlympusLock,
	packageId: string,
	contentDigest: string,
): boolean {
	const record = lock.packages.find((entry) => entry.packageId === packageId);
	return record !== undefined && record.contentDigest !== contentDigest;
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "ENOENT"
	);
}
