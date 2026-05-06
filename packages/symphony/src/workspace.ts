import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Issue, SymphonyConfig, Workspace } from "./types";

export type HookRunner = (
	script: string,
	cwd: string,
	timeoutMs: number,
) => Promise<void>;

export function workspaceKey(identifier: string): string {
	return identifier.replaceAll(/[^A-Za-z0-9._-]/g, "_");
}

export async function ensureWorkspace(
	config: SymphonyConfig,
	issue: Issue,
	runHook: HookRunner = runShellHook,
): Promise<Workspace> {
	const key = workspaceKey(issue.identifier);
	const path = join(config.workspace.root, key);
	let createdNow = false;
	try {
		await mkdir(path);
		createdNow = true;
	} catch (error) {
		if (!isExistsError(error)) throw error;
	}
	if (createdNow && config.hooks.after_create)
		await runHook(config.hooks.after_create, path, config.hooks.timeout_ms);
	return { path, workspace_key: key, created_now: createdNow };
}

export async function removeWorkspace(
	config: SymphonyConfig,
	issue: Issue,
	runHook: HookRunner = runShellHook,
): Promise<void> {
	const path = join(config.workspace.root, workspaceKey(issue.identifier));
	if (config.hooks.before_remove)
		await runHook(config.hooks.before_remove, path, config.hooks.timeout_ms);
	await rm(path, { recursive: true, force: true });
}

export async function runShellHook(
	script: string,
	cwd: string,
	timeoutMs: number,
): Promise<void> {
	await new Promise<void>((resolvePromise, reject) => {
		const child = spawn("sh", ["-lc", script], { cwd, stdio: "ignore" });
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`Hook timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		child.on("exit", (code) => {
			clearTimeout(timeout);
			if (code === 0) resolvePromise();
			else reject(new Error(`Hook failed with exit code ${code}`));
		});
		child.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}

function isExistsError(error: unknown): boolean {
	return Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "EEXIST",
	);
}
