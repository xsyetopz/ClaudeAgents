import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function runCli(args: readonly string[]): Promise<{
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}> {
	const process = Bun.spawn(["bun", "packages/cli/src/cli.ts", ...args], {
		stderr: "pipe",
		stdout: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);
	return { exitCode, stdout, stderr };
}

export async function writeSurfaceConfig(
	root: string,
	surface: "codex" | "claude" | "opencode",
	options: {
		readonly blockedKeyPaths?: readonly string[];
		readonly projectDefaults?: readonly string[];
	} = {},
): Promise<void> {
	const directory = join(root, "source", "surface-configs", surface);
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, "surface-config.toml"),
		[
			`id = "${surface}-surface-config"`,
			'kind = "surface-config"',
			`title = "${surface} Surface Config"`,
			`description = "${surface} fixture surface config."`,
			`surface = "${surface}"`,
			`surfaces = ["${surface}"]`,
			'allowed_key_paths = ["agent", "agent.*.*", "agents.max_depth", "agents.max_threads", "command", "command.*.*", "default_agent", "features.fast_mode", "features.multi_agent", "features.multi_agent_v2", "hooks", "hooks.*.hooks.command", "hooks.*.hooks.statusMessage", "hooks.*.hooks.timeout", "hooks.*.hooks.type", "hooks.*.matcher", "permission.skill", "plugin", "profiles.*.*"]',
			`do_not_emit_key_paths = ${JSON.stringify(options.blockedKeyPaths ?? [])}`,
			"validation_rules = []",
			"",
			...(options.projectDefaults ?? ["[project_defaults]"]),
			"",
			"[default_profile]",
			'profile_id = "fixture"',
			'placement = "generated-project-profile"',
			"emitted_key_paths = []",
			'source_url = "fixture"',
			'validation = "fixture"',
			"",
		].join("\n"),
	);
}
