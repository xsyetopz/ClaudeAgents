import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { runCli, writeSurfaceConfig } from "./cli";

export async function createBlockedOpencodeSourceRoot(): Promise<string> {
	const sourceRoot = await createFixtureRoot();
	await writeSurfaceConfig(sourceRoot, "codex");
	await writeSurfaceConfig(sourceRoot, "claude");
	await writeSurfaceConfig(sourceRoot, "opencode", {
		blockedKeyPaths: ["plugin"],
		projectDefaults: [
			"[project_defaults]",
			'plugin = [".opencode/plugins/openagentlayer.ts"]',
		],
	});
	return sourceRoot;
}

export async function createBlockedCodexSourceRoot(): Promise<string> {
	const sourceRoot = await createFixtureRoot();
	await writeSurfaceConfig(sourceRoot, "codex", {
		blockedKeyPaths: ["features.fast_mode"],
		projectDefaults: ["[project_defaults.features]", "fast_mode = false"],
	});
	await writeSurfaceConfig(sourceRoot, "claude");
	await writeSurfaceConfig(sourceRoot, "opencode");
	return sourceRoot;
}

export async function createCodexConfigConflict(): Promise<string> {
	const targetRoot = await createFixtureRoot();
	await mkdir(join(targetRoot, ".codex"), { recursive: true });
	await writeFile(
		join(targetRoot, ".codex/config.toml"),
		"[features]\nfast_mode = true\n",
	);
	return targetRoot;
}

export async function createClaudeSettingsConflict(): Promise<string> {
	const targetRoot = await createFixtureRoot();
	await mkdir(join(targetRoot, ".claude"), { recursive: true });
	await writeFile(
		join(targetRoot, ".claude/settings.json"),
		'{"hooks":{"UserPromptSubmit":[]}}\n',
	);
	return targetRoot;
}

export async function runProjectInstall(options: {
	readonly root: string;
	readonly surface: "all" | "codex";
	readonly targetRoot: string;
}) {
	return await runCli([
		"install",
		"--surface",
		options.surface,
		"--scope",
		"project",
		"--target",
		options.targetRoot,
		"--root",
		options.root,
	]);
}

export async function codexProjectManifestExists(
	targetRoot: string,
): Promise<boolean> {
	return await Bun.file(
		join(targetRoot, ".oal/manifest/codex-project.json"),
	).exists();
}

export async function codexConfigExists(targetRoot: string): Promise<boolean> {
	return await Bun.file(join(targetRoot, ".codex/config.toml")).exists();
}
