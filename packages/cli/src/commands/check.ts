import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { flag, option, providerOptions } from "../arguments";
import { expandProviders } from "../provider-binaries";
import { renderableSourceReport } from "../source";

const CODEX_COLOR_FIELD = /^color\s*=/m;

export async function runCheckCommand(
	repoRoot: string,
	args: string[] = [],
): Promise<void> {
	const verbose = flag(args, "--verbose");
	console.log("◇ Load OAL source");
	console.log("◇ Validate provider renderability");
	const report = await renderableSourceReport(repoRoot, args);
	if (verbose) {
		console.log(`source: ${report.sourceRoot}`);
		console.log(`providers: ${report.providers.join(", ")}`);
		console.log(`artifacts: ${report.artifacts}`);
		console.log(`unsupported capabilities: ${report.unsupported}`);
	}
	if (flag(args, "--installed")) await assertInstalledState(args, verbose);
	console.log("└ ✓ OAL source and render checks passed");
}

async function assertInstalledState(
	args: string[],
	verbose: boolean,
): Promise<void> {
	const providers = expandProviders(
		providerOptions(option(args, "--provider") ?? "all"),
	);
	const home = resolve(option(args, "--home") ?? homedir());
	const target = resolve(option(args, "--target") ?? ".");
	console.log("◇ Validate installed provider state");
	for (const provider of providers) {
		if (provider === "codex") await assertCodexInstalled(home, target);
		if (provider === "claude") {
			await assertReadable(
				join(home, ".claude/settings.json"),
				"Claude global settings",
			).catch(() =>
				assertReadable(
					join(target, ".claude/settings.json"),
					"Claude project settings",
				),
			);
		}
		if (provider === "opencode") {
			await assertReadable(
				join(home, ".config/opencode/opencode.jsonc"),
				"OpenCode global config",
			).catch(() =>
				assertReadable(
					join(target, "opencode.jsonc"),
					"OpenCode project config",
				),
			);
		}
		if (verbose) console.log(`installed: ${provider}`);
	}
}

async function assertCodexInstalled(
	home: string,
	target: string,
): Promise<void> {
	const config = await readFirst(
		[join(home, ".codex/config.toml"), join(target, ".codex/config.toml")],
		"Codex config",
	);
	if (CODEX_COLOR_FIELD.test(config.content))
		throw new Error(`${config.path} contains unsupported Codex color field.`);
	const agentDir = config.path.startsWith(home)
		? join(home, ".codex/agents")
		: join(target, ".codex/agents");
	const agent = await readFile(join(agentDir, "athena.toml"), "utf8");
	if (CODEX_COLOR_FIELD.test(agent))
		throw new Error(
			"Installed Codex agent TOML contains unsupported color field.",
		);
}

async function assertReadable(path: string, label: string): Promise<string> {
	try {
		return await readFile(path, "utf8");
	} catch {
		throw new Error(`${label} missing at ${path}`);
	}
}

async function readFirst(
	paths: string[],
	label: string,
): Promise<{ path: string; content: string }> {
	for (const path of paths) {
		try {
			return { path, content: await readFile(path, "utf8") };
		} catch {
			// Try next installed scope.
		}
	}
	throw new Error(`${label} missing at ${paths.join(" or ")}`);
}
