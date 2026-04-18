import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function run(command, args, { cwd, env } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, ...env },
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
		});
	});
}

async function exists(target) {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

function wrapperInvocation(name) {
	if (process.platform === "win32") {
		return {
			command: "powershell",
			args: [
				"-NoProfile",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				path.join(ROOT, `${name}.ps1`),
			],
		};
	}
	return {
		command: "bash",
		args: [path.join(ROOT, `${name}.sh`)],
	};
}

function assertPathLabel(target) {
	return target.replace(`${ROOT}${path.sep}`, "");
}

async function assertExists(target) {
	assert.equal(
		await exists(target),
		true,
		`${assertPathLabel(target)} should exist`,
	);
}

async function assertMissing(target) {
	assert.equal(
		await exists(target),
		false,
		`${assertPathLabel(target)} should be removed`,
	);
}

function resolveManagedPaths(tempRoot) {
	const homeDir = path.join(tempRoot, "home");
	const workspace = path.join(tempRoot, "workspace");
	const appDataDir =
		process.platform === "win32"
			? path.join(tempRoot, "appdata")
			: path.join(tempRoot, "xdg");
	const managedBinDir =
		process.platform === "win32"
			? path.join(appDataDir, "openagentsbtw", "bin")
			: path.join(homeDir, ".local", "bin");
	return {
		homeDir,
		workspace,
		appDataDir,
		managedBinDir,
		configEnv: path.join(appDataDir, "openagentsbtw", "config.env"),
		claudeSettings: path.join(homeDir, ".claude", "settings.json"),
		codexConfig: path.join(homeDir, ".codex", "config.toml"),
		codexPlugin: path.join(
			homeDir,
			".codex",
			"plugins",
			"openagentsbtw",
			".codex-plugin",
			"plugin.json",
		),
		codexManagedRoot: path.join(homeDir, ".codex", "openagentsbtw"),
		projectOpenCodePlugin: path.join(
			workspace,
			".opencode",
			"plugins",
			"openagentsbtw.ts",
		),
		projectCopilotHook: path.join(
			workspace,
			".github",
			"hooks",
			"openagentsbtw.json",
		),
		globalCopilotHook: path.join(
			homeDir,
			".copilot",
			"hooks",
			"openagentsbtw.json",
		),
		projectCursorRule: path.join(
			workspace,
			".cursor",
			"rules",
			"openagentsbtw.mdc",
		),
		projectKiloRule: path.join(
			workspace,
			".kilocode",
			"rules",
			"openagentsbtw.md",
		),
		projectAntigravityDir: path.join(workspace, ".antigravity"),
		projectGemini: path.join(workspace, "GEMINI.md"),
		projectGeminiAgent: path.join(
			workspace,
			".gemini",
			"agents",
			"openagentsbtw-athena.md",
		),
		projectGeminiCommand: path.join(
			workspace,
			".gemini",
			"commands",
			"oabtw",
			"openagents-explore.toml",
		),
		projectKiroAgent: path.join(
			workspace,
			".kiro",
			"agents",
			"openagentsbtw-athena.json",
		),
		projectAugmentCommand: path.join(
			workspace,
			".augment",
			"commands",
			"oabtw",
			"openagents-review.md",
		),
		projectClineSkill: path.join(
			workspace,
			".cline",
			"skills",
			"debug",
			"SKILL.md",
		),
		projectRooModeRule: path.join(
			workspace,
			".roo",
			"rules-code",
			"openagentsbtw.md",
		),
		projectCursorIgnore: path.join(workspace, ".cursorignore"),
		globalGemini: path.join(homeDir, ".gemini", "GEMINI.md"),
		globalGeminiAgent: path.join(
			homeDir,
			".gemini",
			"agents",
			"openagentsbtw-athena.md",
		),
		globalGeminiCommand: path.join(
			homeDir,
			".gemini",
			"commands",
			"oabtw",
			"openagents-explore.toml",
		),
		globalKiroAgent: path.join(
			homeDir,
			".kiro",
			"agents",
			"openagentsbtw-athena.json",
		),
		globalAugmentCommand: path.join(
			homeDir,
			".augment",
			"commands",
			"oabtw",
			"openagents-review.md",
		),
		globalClineSkill: path.join(
			homeDir,
			"Documents",
			"Cline",
			"Skills",
			"debug",
			"SKILL.md",
		),
		globalRooModeRule: path.join(
			homeDir,
			".roo",
			"rules-code",
			"openagentsbtw.md",
		),
		globalKiroRule: path.join(homeDir, ".kiro", "steering", "openagentsbtw.md"),
		globalKiloRule: path.join(
			homeDir,
			".kilocode",
			"rules",
			"openagentsbtw.md",
		),
		globalKiloAgents: path.join(appDataDir, "kilo", "AGENTS.md"),
		globalRooRule: path.join(homeDir, ".roo", "rules", "openagentsbtw.md"),
		globalClineRule: path.join(
			homeDir,
			"Documents",
			"Cline",
			"Rules",
			"openagentsbtw.md",
		),
		globalAmpAgents: path.join(appDataDir, "amp", "AGENTS.md"),
		globalAugmentRule: path.join(
			homeDir,
			".augment",
			"rules",
			"openagentsbtw.md",
		),
		projectCursorMcp: path.join(workspace, ".cursor", "mcp.json"),
		projectGeminiSettings: path.join(workspace, ".gemini", "settings.json"),
		projectKiroMcp: path.join(workspace, ".kiro", "settings", "mcp.json"),
		projectKiroHook: path.join(
			workspace,
			".kiro",
			"hooks",
			"openagentsbtw.json",
		),
		projectClineWorkflow: path.join(
			workspace,
			".clinerules",
			"workflows",
			"openagents-review.md",
		),
		projectAugmentSettings: path.join(workspace, ".augment", "settings.json"),
		projectAugmentHook: path.join(
			workspace,
			".augment",
			"hooks",
			"openagentsbtw.json",
		),
		projectAmpSkill: path.join(
			workspace,
			".agents",
			"skills",
			"review",
			"SKILL.md",
		),
		projectAmpCheck: path.join(
			workspace,
			".agents",
			"checks",
			"openagentsbtw.md",
		),
		projectAmpSettings: path.join(workspace, ".amp", "settings.json"),
		projectAirReview: path.join(workspace, "review-prompt.md"),
		projectAgenticGuard: path.join(
			workspace,
			".openagentsbtw",
			"agentic",
			"hooks",
			"openagentsbtw-agentic-guard.mjs",
		),
		globalGeminiSettings: path.join(homeDir, ".gemini", "settings.json"),
		globalKiroMcp: path.join(homeDir, ".kiro", "settings", "mcp.json"),
		globalKiroHook: path.join(homeDir, ".kiro", "hooks", "openagentsbtw.json"),
		globalClineWorkflow: path.join(
			homeDir,
			"Documents",
			"Cline",
			"Workflows",
			"openagents-review.md",
		),
		globalAugmentSettings: path.join(homeDir, ".augment", "settings.json"),
		globalAugmentHook: path.join(
			homeDir,
			".augment",
			"hooks",
			"openagentsbtw.json",
		),
		globalAmpSkill: path.join(
			appDataDir,
			"amp",
			"skills",
			"review",
			"SKILL.md",
		),
		globalAmpCheck: path.join(appDataDir, "amp", "checks", "openagentsbtw.md"),
		globalAmpSettings: path.join(appDataDir, "amp", "settings.json"),
		globalAgenticGuard: path.join(
			appDataDir,
			"openagentsbtw",
			"agentic",
			"hooks",
			"openagentsbtw-agentic-guard.mjs",
		),
	};
}

async function main() {
	const tempRoot = await mkdtemp(
		path.join(os.tmpdir(), "oabtw-install-smoke-"),
	);
	const paths = resolveManagedPaths(tempRoot);
	const env = {
		CI: "true",
		HOME: paths.homeDir,
		USERPROFILE: paths.homeDir,
		APPDATA: paths.appDataDir,
		XDG_CONFIG_HOME: paths.appDataDir,
	};

	await mkdir(paths.homeDir, { recursive: true });
	await mkdir(paths.workspace, { recursive: true });
	await mkdir(paths.appDataDir, { recursive: true });

	try {
		const install = wrapperInvocation("install");
		await run(
			install.command,
			[
				...install.args,
				"--all",
				"--skip-rtk",
				"--claude-plan",
				"max-5",
				"--codex-plan",
				"pro-5",
				"--no-codex-set-top-profile",
				"--opencode-scope",
				"project",
				"--copilot-scope",
				"both",
				"--copilot-plan",
				"pro",
			],
			{ cwd: paths.workspace, env },
		);

		await assertExists(paths.claudeSettings);
		await assertExists(paths.codexConfig);
		await assertExists(paths.codexPlugin);
		await assertExists(paths.codexManagedRoot);
		await assertExists(paths.projectOpenCodePlugin);
		await assertExists(paths.projectCopilotHook);
		await assertExists(paths.globalCopilotHook);
		await assertExists(paths.projectCursorRule);
		await assertExists(paths.projectKiloRule);
		await assertExists(paths.projectGemini);
		await assertMissing(paths.projectGeminiAgent);
		await assertMissing(paths.projectAntigravityDir);
		if (process.platform === "win32") {
			await assertExists(path.join(paths.managedBinDir, "oabtw-codex.ps1"));
			await assertExists(path.join(paths.managedBinDir, "oabtw-codex.cmd"));
		} else {
			await assertExists(path.join(paths.managedBinDir, "oabtw-codex"));
		}

		await run(
			install.command,
			[
				...install.args,
				"--agentic-ides",
				"--agentic-ide-scope",
				"both",
				"--agentic-ide-depth",
				"native",
			],
			{ cwd: paths.workspace, env },
		);
		await assertExists(paths.globalGemini);
		await assertExists(paths.globalKiroRule);
		await assertExists(paths.globalKiloRule);
		await assertExists(paths.globalKiloAgents);
		await assertExists(paths.globalRooRule);
		await assertExists(paths.globalClineRule);
		await assertExists(paths.globalAmpAgents);
		await assertExists(paths.globalAugmentRule);
		await assertExists(paths.projectGeminiAgent);
		await assertExists(paths.projectGeminiCommand);
		await assertExists(paths.projectKiroAgent);
		await assertExists(paths.projectAugmentCommand);
		await assertExists(paths.projectClineSkill);
		await assertExists(paths.projectRooModeRule);
		await assertExists(paths.projectCursorIgnore);
		await assertExists(paths.globalGeminiAgent);
		await assertExists(paths.globalGeminiCommand);
		await assertExists(paths.globalKiroAgent);
		await assertExists(paths.globalAugmentCommand);
		await assertExists(paths.globalClineSkill);
		await assertExists(paths.globalRooModeRule);

		await run(
			install.command,
			[
				...install.args,
				"--agentic-ides",
				"--agentic-ide-scope",
				"both",
				"--agentic-ide-depth",
				"full",
				"--deepwiki-mcp",
				"--ctx7-cli",
			],
			{ cwd: paths.workspace, env },
		);
		for (const target of [
			paths.projectCursorMcp,
			paths.projectGeminiSettings,
			paths.projectKiroMcp,
			paths.projectKiroHook,
			paths.projectClineWorkflow,
			paths.projectAugmentSettings,
			paths.projectAugmentHook,
			paths.projectAmpSkill,
			paths.projectAmpCheck,
			paths.projectAmpSettings,
			paths.projectAirReview,
			paths.projectAgenticGuard,
			paths.globalGeminiSettings,
			paths.globalKiroMcp,
			paths.globalKiroHook,
			paths.globalClineWorkflow,
			paths.globalAugmentSettings,
			paths.globalAugmentHook,
			paths.globalAmpSkill,
			paths.globalAmpCheck,
			paths.globalAmpSettings,
			paths.globalAgenticGuard,
		]) {
			await assertExists(target);
		}
		for (const target of [
			paths.projectCursorMcp,
			paths.projectGeminiSettings,
			paths.projectKiroMcp,
			paths.projectAugmentSettings,
			paths.projectAmpSettings,
			paths.globalGeminiSettings,
			paths.globalKiroMcp,
			paths.globalAugmentSettings,
			paths.globalAmpSettings,
		]) {
			const content = await readFile(target, "utf8");
			assert.match(content, /openagentsbtw/);
			assert.match(content, /deepwiki/);
			assert.match(content, /ctx7/);
		}

		const config = wrapperInvocation("config");
		await run(
			config.command,
			[...config.args, "--copilot-plan", "pro-plus", "--codex-plan", "plus"],
			{ cwd: paths.workspace, env },
		);

		const configEnv = await readFile(paths.configEnv, "utf8");
		assert.match(configEnv, /OABTW_COPILOT_PLAN=pro-plus/);
		assert.match(configEnv, /OABTW_CODEX_PLAN=plus/);
		const codexConfig = await readFile(paths.codexConfig, "utf8");
		assert.match(codexConfig, /^profile = "openagentsbtw"$/m);
		assert.equal(codexConfig.includes("openagentsbtw-plus"), false);

		const uninstall = wrapperInvocation("uninstall");
		await run(
			uninstall.command,
			[
				...uninstall.args,
				"--all",
				"--opencode-scope",
				"project",
				"--copilot-scope",
				"both",
				"--agentic-ide-scope",
				"both",
			],
			{ cwd: paths.workspace, env },
		);

		await assertMissing(paths.codexPlugin);
		await assertMissing(paths.codexManagedRoot);
		await assertMissing(paths.projectOpenCodePlugin);
		await assertMissing(paths.projectCopilotHook);
		await assertMissing(paths.globalCopilotHook);
		await assertMissing(paths.projectCursorRule);
		await assertMissing(paths.projectKiloRule);
		await assertMissing(paths.projectGeminiAgent);
		await assertMissing(paths.projectGeminiCommand);
		await assertMissing(paths.projectKiroAgent);
		await assertMissing(paths.projectAugmentCommand);
		await assertMissing(paths.projectClineSkill);
		await assertMissing(paths.projectRooModeRule);
		await assertMissing(paths.globalGeminiAgent);
		await assertMissing(paths.globalGeminiCommand);
		await assertMissing(paths.globalKiroAgent);
		await assertMissing(paths.globalAugmentCommand);
		await assertMissing(paths.globalClineSkill);
		await assertMissing(paths.globalRooModeRule);
		for (const target of [
			paths.projectKiroHook,
			paths.projectClineWorkflow,
			paths.projectAugmentHook,
			paths.projectAmpSkill,
			paths.projectAmpCheck,
			paths.projectAgenticGuard,
			paths.globalKiroHook,
			paths.globalClineWorkflow,
			paths.globalAugmentHook,
			paths.globalAmpSkill,
			paths.globalAmpCheck,
			paths.globalAgenticGuard,
		]) {
			await assertMissing(target);
		}
		for (const target of [
			paths.projectCursorMcp,
			paths.projectGeminiSettings,
			paths.projectKiroMcp,
			paths.projectAugmentSettings,
			paths.projectAmpSettings,
			paths.globalGeminiSettings,
			paths.globalKiroMcp,
			paths.globalAugmentSettings,
			paths.globalAmpSettings,
		]) {
			const content = await readFile(target, "utf8");
			assert.equal(content.includes("openagentsbtw"), false);
			assert.equal(content.includes("deepwiki"), false);
			assert.equal(content.includes("ctx7"), false);
		}
		const projectAirReviewAfter = await readFile(
			paths.projectAirReview,
			"utf8",
		);
		assert.equal(
			projectAirReviewAfter.includes("openagentsbtw agentic-ides air-review"),
			false,
		);
		await assertMissing(paths.globalKiroRule);
		await assertMissing(paths.globalKiloRule);
		await assertMissing(paths.globalRooRule);
		await assertMissing(paths.globalClineRule);
		await assertMissing(paths.globalAugmentRule);
		const globalGeminiAfter = await readFile(paths.globalGemini, "utf8");
		assert.equal(
			globalGeminiAfter.includes("openagentsbtw agentic-ides"),
			false,
		);
		const globalKiloAgentsAfter = await readFile(
			paths.globalKiloAgents,
			"utf8",
		);
		assert.equal(
			globalKiloAgentsAfter.includes("openagentsbtw agentic-ides"),
			false,
		);
		const globalAmpAgentsAfter = await readFile(paths.globalAmpAgents, "utf8");
		assert.equal(
			globalAmpAgentsAfter.includes("openagentsbtw agentic-ides"),
			false,
		);
		const projectCursorIgnoreAfter = await readFile(
			paths.projectCursorIgnore,
			"utf8",
		);
		assert.equal(
			projectCursorIgnoreAfter.includes("openagentsbtw agentic-ides ignore"),
			false,
		);
		const projectGeminiAfter = await readFile(paths.projectGemini, "utf8");
		assert.equal(
			projectGeminiAfter.includes("openagentsbtw agentic-ides"),
			false,
		);
		const codexConfigAfter = await readFile(paths.codexConfig, "utf8");
		assert.equal(
			codexConfigAfter.includes("# >>> openagentsbtw codex >>>"),
			false,
		);
		if (await exists(paths.claudeSettings)) {
			const claudeSettings = await readFile(paths.claudeSettings, "utf8");
			assert.equal(claudeSettings.includes("openagentsbtw"), false);
		}
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
