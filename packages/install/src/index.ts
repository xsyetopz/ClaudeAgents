import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
	AdapterArtifact,
	AdapterBundle,
} from "@openagentlayer/adapter-contract";
import type { Surface } from "@openagentlayer/types";

export type InstallScope = "project" | "global";

export interface ManagedManifestEntry {
	readonly path: string;
	readonly sha256: string;
	readonly artifactKind: string;
	readonly sourceRecordIds: readonly string[];
}

export interface ManagedManifest {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly targetRoot: string;
	readonly generatedAt: "deterministic";
	readonly entries: readonly ManagedManifestEntry[];
}

export interface InstallRequest {
	readonly bundle: AdapterBundle;
	readonly scope: InstallScope;
	readonly targetRoot: string;
}

export interface InstallResult {
	readonly manifest: ManagedManifest;
	readonly writtenFiles: readonly string[];
}

export interface UninstallRequest {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly targetRoot: string;
}

export interface UninstallResult {
	readonly manifestPath: string;
	readonly removedFiles: readonly string[];
}

export interface InstallVerificationRequest {
	readonly surface: Surface;
	readonly scope: InstallScope;
	readonly targetRoot: string;
}

export interface InstallVerificationIssue {
	readonly code:
		| "missing-manifest"
		| "invalid-manifest"
		| "missing-file"
		| "hash-mismatch"
		| "path-escape"
		| "hook-execution-failed";
	readonly path: string;
	readonly message: string;
}

export interface InstallVerificationResult {
	readonly manifestPath: string;
	readonly issues: readonly InstallVerificationIssue[];
}

interface ManifestReadResult {
	readonly manifest?: ManagedManifest;
	readonly issues: readonly InstallVerificationIssue[];
}

export async function createInstallPlan(
	request: InstallRequest,
): Promise<ManagedManifest> {
	return {
		surface: request.bundle.surface,
		scope: request.scope,
		targetRoot: resolve(request.targetRoot),
		generatedAt: "deterministic",
		entries: await Promise.all(
			request.bundle.artifacts.map((artifact) => {
				resolveManagedPath(request.targetRoot, artifact.path);
				return createManifestEntry(artifact);
			}),
		),
	};
}

export async function applyInstallPlan(
	request: InstallRequest,
): Promise<InstallResult> {
	const manifest = await createInstallPlan(request);
	const writtenFiles: string[] = [];
	for (const artifact of request.bundle.artifacts) {
		const targetPath = resolveManagedPath(manifest.targetRoot, artifact.path);
		await mkdir(dirname(targetPath), { recursive: true });
		await writeFile(targetPath, artifact.content);
		writtenFiles.push(targetPath);
	}

	const manifestPath = getManifestPath(
		manifest.targetRoot,
		manifest.surface,
		manifest.scope,
	);
	await mkdir(dirname(manifestPath), { recursive: true });
	await writeFile(manifestPath, `${stableJson(manifest)}\n`);
	writtenFiles.push(manifestPath);

	return { manifest, writtenFiles };
}

export async function uninstallManagedFiles(
	request: UninstallRequest,
): Promise<UninstallResult> {
	const targetRoot = resolve(request.targetRoot);
	const manifestPath = getManifestPath(
		targetRoot,
		request.surface,
		request.scope,
	);
	if (!(await Bun.file(manifestPath).exists())) {
		return { manifestPath, removedFiles: [] };
	}
	const manifest = JSON.parse(
		await Bun.file(manifestPath).text(),
	) as ManagedManifest;
	const removedFiles: string[] = [];

	for (const entry of [...manifest.entries].sort((left, right) =>
		right.path.localeCompare(left.path),
	)) {
		const targetPath = resolveManagedPath(targetRoot, entry.path);
		await rm(targetPath, { force: true });
		removedFiles.push(targetPath);
		await removeEmptyManagedParents(targetRoot, dirname(entry.path));
	}

	await rm(manifestPath, { force: true });
	removedFiles.push(manifestPath);
	await removeEmptyManagedParents(
		targetRoot,
		dirname(relativeManifestPath(request.surface, request.scope)),
	);

	return { manifestPath, removedFiles };
}

export async function verifyManagedInstall(
	request: InstallVerificationRequest,
): Promise<InstallVerificationResult> {
	const targetRoot = resolve(request.targetRoot);
	const manifestPath = getManifestPath(
		targetRoot,
		request.surface,
		request.scope,
	);
	if (!(await Bun.file(manifestPath).exists())) {
		return {
			manifestPath,
			issues: [
				{
					code: "missing-manifest",
					message: `Missing managed manifest for ${request.surface}/${request.scope}.`,
					path: relative(targetRoot, manifestPath),
				},
			],
		};
	}

	const manifestResult = await readManifest(manifestPath, targetRoot);
	if (manifestResult.manifest === undefined) {
		return { manifestPath, issues: manifestResult.issues };
	}
	const manifest = manifestResult.manifest;

	const issues: InstallVerificationIssue[] = [];
	for (const entry of manifest.entries) {
		let targetPath: string;
		try {
			targetPath = resolveManagedPath(targetRoot, entry.path);
		} catch (error) {
			issues.push({
				code: "path-escape",
				message: error instanceof Error ? error.message : String(error),
				path: entry.path,
			});
			continue;
		}

		const file = Bun.file(targetPath);
		if (!(await file.exists())) {
			issues.push({
				code: "missing-file",
				message: `Managed file is missing: ${entry.path}`,
				path: entry.path,
			});
			continue;
		}

		const content = await file.text();
		const actualSha = await sha256(content);
		if (actualSha !== entry.sha256) {
			issues.push({
				code: "hash-mismatch",
				message: `Managed file hash mismatch: ${entry.path}`,
				path: entry.path,
			});
		}

		if (isHookLikeEntry(entry)) {
			const hookIssue = await verifyHookScript(targetPath, entry.path);
			if (hookIssue !== undefined) {
				issues.push(hookIssue);
			}
		}
	}

	return { manifestPath, issues };
}

export function getManifestPath(
	targetRoot: string,
	surface: Surface,
	scope: InstallScope,
): string {
	return join(resolve(targetRoot), relativeManifestPath(surface, scope));
}

function relativeManifestPath(surface: Surface, scope: InstallScope): string {
	return join(".oal", "manifest", `${surface}-${scope}.json`);
}

function resolveManagedPath(targetRoot: string, relativePath: string): string {
	if (isAbsolute(relativePath)) {
		throw new Error(`Managed path must be relative: ${relativePath}`);
	}

	const root = resolve(targetRoot);
	const resolvedPath = resolve(root, relativePath);
	const relativeToRoot = relative(root, resolvedPath);
	if (
		relativeToRoot === ".." ||
		relativeToRoot.startsWith(`..${sep}`) ||
		isAbsolute(relativeToRoot)
	) {
		throw new Error(`Managed path escapes target root: ${relativePath}`);
	}
	return resolvedPath;
}

async function createManifestEntry(
	artifact: AdapterArtifact,
): Promise<ManagedManifestEntry> {
	return {
		path: artifact.path,
		sha256: await sha256(artifact.content),
		artifactKind: artifact.kind,
		sourceRecordIds: artifact.sourceRecordIds,
	};
}

async function readManifest(
	manifestPath: string,
	targetRoot: string,
): Promise<ManifestReadResult> {
	try {
		return {
			issues: [],
			manifest: JSON.parse(
				await Bun.file(manifestPath).text(),
			) as ManagedManifest,
		};
	} catch (error) {
		return {
			issues: [
				{
					code: "invalid-manifest",
					message: error instanceof Error ? error.message : String(error),
					path: relative(targetRoot, manifestPath),
				},
			],
		};
	}
}

function isHookLikeEntry(entry: ManagedManifestEntry): boolean {
	return entry.artifactKind === "hook" && entry.path.endsWith(".mjs");
}

async function verifyHookScript(
	targetPath: string,
	relativePath: string,
): Promise<InstallVerificationIssue | undefined> {
	const process = Bun.spawn(["bun", targetPath], {
		stderr: "pipe",
		stdin: "pipe",
		stdout: "pipe",
	});
	process.stdin.write("{}");
	process.stdin.end();
	const [stdout, stderr] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	try {
		const parsed = JSON.parse(stdout) as { readonly decision?: unknown };
		if (typeof parsed.decision === "string") {
			return undefined;
		}
	} catch {
		// Report below with stderr/stdout context.
	}
	return {
		code: "hook-execution-failed",
		message: `Hook script did not produce a runtime decision: ${stderr || stdout}`,
		path: relativePath,
	};
}

async function sha256(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function removeEmptyManagedParents(
	targetRoot: string,
	relativeDirectory: string,
): Promise<void> {
	let current = relativeDirectory;
	while (current !== "." && current !== "") {
		const absolute = join(targetRoot, current);
		if (!(await isDirectoryEmpty(absolute))) {
			return;
		}
		await rm(absolute, { force: true, recursive: true });
		current = dirname(current);
	}
}

async function isDirectoryEmpty(path: string): Promise<boolean> {
	try {
		const entries = await readdir(path);
		return entries.length === 0;
	} catch (error) {
		return isNotFoundError(error);
	}
}

function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input), null, 2);
}

function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson);
	}
	if (typeof input !== "object" || input === null) {
		return input;
	}
	const record = input as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		sorted[key] = sortJson(record[key]);
	}
	return sorted;
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
