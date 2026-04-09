import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	getClaudePlan,
	resolveClaudePlan,
	resolveCodexPlan,
	resolveCopilotPlan,
} from "../../source/subscriptions.mjs";
import {
	mergeCodexConfig,
	mergeCodexHooks,
	mergeTaggedMarkdown,
	updateCodexAgents,
	updateCodexMarketplace,
} from "./managed-files.mjs";
import {
	commandExists,
	ctx7RunnerLine,
	fail,
	loadConfigEnv,
	logInfo,
	logWarn,
	PATHS,
	pathExists,
	promptText,
	promptToggle,
	ROOT,
	readText,
	run,
	writeConfigEnv,
	writeText,
} from "./shared.mjs";

function usage() {
	console.log(`openagentsbtw installer

Usage: ./install.sh [system toggles] [options]

System toggles (allow multiple):
  --claude                Install Claude Code support
  --opencode              Install OpenCode support
  --codex                 Install Codex support
  --copilot               Install GitHub Copilot support
  --all                   Install all supported systems

Options:
  --skip-rtk              Skip RTK install for Claude Code, Codex, OpenCode, and Copilot
  --claude-plan plus|pro-5|pro-20
                          Claude capability preset (default: pro-5)
  --claude-tier 5x|20x    Legacy alias for --claude-plan
  --opencode-scope project|global
                          OpenCode install target (default: global)
  --opencode-default-model MODEL
                          Use one model id for all OpenCode agents
  --opencode-model ROLE=MODEL
                          Override a specific OpenCode role model
  --copilot-scope global|project|both
                          Copilot install target (default: global)
  --copilot-plan pro|pro-plus
                          Copilot capability preset (default: pro)
  --codex-plan go|plus|pro-5|pro-20
                          Codex capability preset (default: pro-5)
  --codex-tier plus|pro   Legacy alias for --codex-plan
  --codex-set-top-profile Force setting top-level Codex profile in ~/.codex/config.toml
  --no-codex-set-top-profile
                          Do not set top-level Codex profile in ~/.codex/config.toml
  --deepwiki-mcp          Configure DeepWiki MCP where supported
  --codex-deepwiki        Alias for --deepwiki-mcp
  --ctx7-cli              Install Context7 CLI support
  --no-ctx7-cli           Do not install Context7 CLI support
  --playwright-cli        Install Playwright CLI (browser automation)
  --no-playwright-cli     Do not install Playwright CLI
  -h, --help              Show this help`);
}

function parseArgs(argv) {
	const args = {
		installClaude: false,
		installOpenCode: false,
		installCodex: false,
		installCopilot: false,
		skipRtk: false,
		claudePlan: "pro-5",
		claudePlanSet: false,
		opencodeScope: "global",
		opencodeDefaultModel: "",
		opencodeModelOverrides: [],
		copilotScope: "global",
		copilotPlan: "pro",
		copilotPlanSet: false,
		codexPlan: "",
		codexPlanSet: false,
		deepwikiMcp: false,
		deepwikiMcpSet: false,
		codexSetTopProfile: "auto",
		playwrightCli: false,
		playwrightCliSet: false,
		ctx7Cli: false,
		ctx7CliSet: false,
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		switch (token) {
			case "--claude":
				args.installClaude = true;
				break;
			case "--opencode":
				args.installOpenCode = true;
				break;
			case "--codex":
				args.installCodex = true;
				break;
			case "--copilot":
				args.installCopilot = true;
				break;
			case "--all":
				args.installClaude = true;
				args.installOpenCode = true;
				args.installCodex = true;
				args.installCopilot = true;
				break;
			case "--skip-rtk":
				args.skipRtk = true;
				break;
			case "--claude-tier":
				args.claudePlan = resolveClaudePlan(argv[++index] ?? "");
				args.claudePlanSet = true;
				break;
			case "--claude-plan":
				args.claudePlan = argv[++index] ?? "";
				args.claudePlanSet = true;
				break;
			case "--opencode-scope":
				args.opencodeScope = argv[++index] ?? "";
				break;
			case "--opencode-default-model":
				args.opencodeDefaultModel = argv[++index] ?? "";
				break;
			case "--opencode-model":
				args.opencodeModelOverrides.push(argv[++index] ?? "");
				break;
			case "--copilot-scope":
				args.copilotScope = argv[++index] ?? "";
				break;
			case "--copilot-plan":
				args.copilotPlan = argv[++index] ?? "";
				args.copilotPlanSet = true;
				break;
			case "--codex-tier":
				args.codexPlan = resolveCodexPlan(argv[++index] ?? "");
				args.codexPlanSet = true;
				break;
			case "--codex-plan":
				args.codexPlan = argv[++index] ?? "";
				args.codexPlanSet = true;
				break;
			case "--codex-set-top-profile":
				args.codexSetTopProfile = "true";
				break;
			case "--no-codex-set-top-profile":
				args.codexSetTopProfile = "false";
				break;
			case "--deepwiki-mcp":
			case "--codex-deepwiki":
				args.deepwikiMcp = true;
				args.deepwikiMcpSet = true;
				break;
			case "--ctx7-cli":
				args.ctx7Cli = true;
				args.ctx7CliSet = true;
				break;
			case "--no-ctx7-cli":
				args.ctx7Cli = false;
				args.ctx7CliSet = true;
				break;
			case "--playwright-cli":
				args.playwrightCli = true;
				args.playwrightCliSet = true;
				break;
			case "--no-playwright-cli":
				args.playwrightCli = false;
				args.playwrightCliSet = true;
				break;
			case "-h":
			case "--help":
				args.help = true;
				break;
			default:
				fail(`Unknown argument: ${token}`);
		}
	}

	return args;
}

function isCi() {
	return process.env.CI === "true";
}

function repoPath(...segments) {
	return path.join(ROOT, ...segments);
}

async function ensureSelection(args) {
	if (
		args.installClaude ||
		args.installOpenCode ||
		args.installCodex ||
		args.installCopilot
	) {
		return;
	}

	console.log("\x1b[0;32mSelect systems to install\x1b[0m");
	args.installClaude = await promptToggle(
		"Install Claude Code support?",
		true,
		isCi(),
	);
	args.installOpenCode = await promptToggle(
		"Install OpenCode support?",
		true,
		isCi(),
	);
	args.installCodex = await promptToggle(
		"Install Codex support?",
		true,
		isCi(),
	);
	args.installCopilot = await promptToggle(
		"Install GitHub Copilot support?",
		true,
		isCi(),
	);

	if (
		!args.installClaude &&
		!args.installOpenCode &&
		!args.installCodex &&
		!args.installCopilot
	) {
		fail("No systems selected");
	}
}

async function promptOptionalSurfaces(args, existingEnv) {
	if (args.installClaude && !args.claudePlanSet && !isCi()) {
		args.claudePlan =
			resolveClaudePlan(
				(await promptText(
					"Claude plan preset [plus/pro-5/pro-20]:",
					false,
					args.claudePlan || existingEnv.OABTW_CLAUDE_PLAN || "pro-5",
				)) ||
					args.claudePlan ||
					existingEnv.OABTW_CLAUDE_PLAN ||
					"pro-5",
			) || "pro-5";
	}
	if (args.installOpenCode && !args.opencodeDefaultModel && !isCi()) {
		args.opencodeDefaultModel = await promptText(
			"OpenCode default model for all agents (blank = auto-detect/fallback):",
		);
	}
	if (args.installCodex && !args.codexPlanSet && !args.codexPlan) {
		args.codexPlan = isCi()
			? existingEnv.OABTW_CODEX_PLAN || "pro-5"
			: resolveCodexPlan(
					(await promptText(
						"Codex plan preset [go/plus/pro-5/pro-20]:",
						false,
						args.codexPlan || existingEnv.OABTW_CODEX_PLAN || "pro-5",
					)) || "pro-5",
				) ||
				existingEnv.OABTW_CODEX_PLAN ||
				"pro-5";
	}
	if (args.installCodex && args.codexSetTopProfile === "auto" && !isCi()) {
		const profileName = `openagentsbtw-${args.codexPlan}`;
		args.codexSetTopProfile = (await promptToggle(
			`Set Codex default profile at top-level in ~/.codex/config.toml to ${profileName}?`,
			true,
		))
			? "true"
			: "false";
	}
	if (args.installCopilot && !args.copilotPlanSet && !isCi()) {
		args.copilotPlan =
			resolveCopilotPlan(
				(await promptText(
					"Copilot plan preset [pro/pro-plus]:",
					false,
					args.copilotPlan || existingEnv.OABTW_COPILOT_PLAN || "pro",
				)) ||
					args.copilotPlan ||
					existingEnv.OABTW_COPILOT_PLAN ||
					"pro",
			) || "pro";
	}
	if (
		!args.ctx7CliSet &&
		(args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot)
	) {
		args.ctx7Cli = await promptToggle(
			"Install Context7 CLI support?",
			true,
			isCi(),
		);
	}
	if (
		!args.deepwikiMcpSet &&
		(args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot)
	) {
		args.deepwikiMcp = await promptToggle(
			"Configure DeepWiki MCP where supported?",
			false,
			isCi(),
		);
	}
	if (
		!args.playwrightCliSet &&
		(args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot)
	) {
		args.playwrightCli = await promptToggle(
			"Install Playwright CLI support (browser automation)?",
			false,
			isCi(),
		);
	}
	args.context7ApiKey = existingEnv.CONTEXT7_API_KEY || "";
}

function validateArgs(args) {
	args.claudePlan = resolveClaudePlan(args.claudePlan);
	if (!args.claudePlan) {
		fail(
			`Unsupported Claude plan: ${args.claudePlan} (expected plus, pro-5, or pro-20)`,
		);
	}
	if (!["global", "project"].includes(args.opencodeScope)) {
		fail(
			`Unsupported OpenCode scope: ${args.opencodeScope} (expected global or project)`,
		);
	}
	args.codexPlan = resolveCodexPlan(args.codexPlan || "pro-5");
	if (args.installCodex && !args.codexPlan) {
		fail(
			`Unsupported Codex plan: ${args.codexPlan} (expected go, plus, pro-5, or pro-20)`,
		);
	}
	args.copilotPlan = resolveCopilotPlan(args.copilotPlan);
	if (!args.copilotPlan) {
		fail(
			`Unsupported Copilot plan: ${args.copilotPlan} (expected pro or pro-plus)`,
		);
	}
	if (!["global", "project", "both"].includes(args.copilotScope)) {
		fail(
			`Unsupported Copilot scope: ${args.copilotScope} (expected global, project, or both)`,
		);
	}
}

async function ensureNode() {
	if (!commandExists("node")) {
		fail(
			"node not found. Claude and Codex hook scripts require Node.js >= 24.14.1.",
		);
	}
	const version = process.versions.node.split(".").map(Number);
	const [major = 0, minor = 0, patch = 0] = version;
	if (
		major < 24 ||
		(major === 24 && minor < 14) ||
		(major === 24 && minor === 14 && patch < 1)
	) {
		fail(`Node.js v${process.versions.node} is too old. Requires >= 24.14.1.`);
	}
	logInfo(`Node.js v${process.versions.node}`);
}

async function ensureBun() {
	if (commandExists("bun")) {
		const result = await runVersion("bun", ["--version"]);
		logInfo(`bun ${result}`);
		return;
	}
	if (isCi()) {
		fail("bun not found and CI mode is enabled. Install bun first.");
	}
	logWarn(
		"bun not found; attempting to install bun (required for OpenCode support and preferred for JS tooling)",
	);
	await run("sh", ["-lc", "curl -fsSL https://bun.sh/install | bash"]);
	process.env.PATH = `${path.join(os.homedir(), ".bun", "bin")}:${process.env.PATH ?? ""}`;
}

async function ensureJq() {
	if (!commandExists("jq")) {
		fail(
			"jq is required for Claude settings.json merging. Install with: brew install jq",
		);
	}
	logInfo("jq found");
}

async function runVersion(command, args) {
	const output = await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.on("exit", (code) => {
			if (code === 0) resolve(stdout.trim());
			else reject(new Error(`${command} ${args.join(" ")} failed`));
		});
		child.on("error", reject);
	});
	return output;
}

async function ensurePython3() {
	if (!commandExists("python3")) {
		fail("python3 is required for Codex installation.");
	}
	const version = await runVersion("python3", ["--version"]);
	logInfo(version);
}

async function ensureClaudeVersion() {
	if (isCi()) {
		logInfo("CI mode - skipping claude CLI version check");
		return;
	}
	if (!commandExists("claude")) {
		fail("claude CLI not found. Install Claude Code first.");
	}
	const versionRaw = await runVersion("claude", ["--version"]);
	const match = versionRaw.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		logWarn("Could not parse claude version, proceeding anyway");
		return;
	}
	const major = Number(match[1]);
	const minor = Number(match[2]);
	const patch = Number(match[3]);
	if (
		!(major > 2 || (major === 2 && (minor > 1 || (minor === 1 && patch >= 76))))
	) {
		fail(`Claude Code v${match[0]} is too old. Requires >= 2.1.76`);
	}
	logInfo(`Claude Code v${match[0]}`);
}

async function buildArtifacts() {
	const buildDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "openagentsbtw-build-"),
	);
	await run("node", [repoPath("scripts", "build.mjs"), "--out", buildDir], {
		cwd: ROOT,
	});
	logInfo(`Generated install artifacts -> ${buildDir}`);
	return {
		buildDir,
		claudeDir: path.join(buildDir, "claude"),
		codexDir: path.join(buildDir, "codex"),
		copilotDir: path.join(buildDir, "copilot"),
		opencodeTemplatesDir: path.join(buildDir, "opencode", "templates"),
		binDir: path.join(buildDir, "bin"),
	};
}

function configureClaudeModels(planName) {
	return getClaudePlan(planName).models;
}

async function installCtx7WrapperAndEnv(apiKey) {
	await writeConfigEnv({ CONTEXT7_API_KEY: apiKey });
	await writeText(
		PATHS.ctx7Wrapper,
		`#!/bin/bash
set -euo pipefail

if [[ -f "${PATHS.configEnvFile}" ]]; then
  # shellcheck disable=SC1090
  source "${PATHS.configEnvFile}"
  export CONTEXT7_API_KEY="\${CONTEXT7_API_KEY:-}"
fi

${ctx7RunnerLine()}
`,
		true,
	);
	logInfo("ctx7 wrapper -> ~/.local/bin/ctx7");
}

async function maybeInstallCtx7(args) {
	if (!args.ctx7Cli) return;
	console.log("\n\x1b[0;32mctx7\x1b[0m");
	if (isCi()) {
		logInfo("CI mode - skipping ctx7 setup");
		return;
	}
	if (!args.context7ApiKey) {
		const wantsKey = await promptToggle(
			"Provide Context7 API key for higher rate limits?",
			false,
			false,
		);
		if (wantsKey) {
			args.context7ApiKey = await promptText("Context7 API key:");
		}
	}
	await installCtx7WrapperAndEnv(args.context7ApiKey);
	try {
		await runJsPackage("ctx7@latest", ["--help"]);
		logInfo("ctx7 CLI available via ~/.local/bin/ctx7");
	} catch {
		logWarn(
			"ctx7 package runner check failed; the managed wrapper will still pick an available JS runner at runtime",
		);
	}
}

async function maybeInstallPlaywright(args) {
	if (!args.playwrightCli) return;
	console.log("\n\x1b[0;32mPlaywright CLI\x1b[0m");
	if (isCi()) {
		logInfo("CI mode - skipping Playwright CLI install");
		return;
	}
	if (commandExists("playwright-cli")) {
		logInfo("playwright-cli already installed");
	} else if (commandExists("bun")) {
		await run("bun", ["add", "-g", "@playwright/cli@latest"]);
	} else if (commandExists("pnpm")) {
		await run("pnpm", ["add", "-g", "@playwright/cli@latest"]);
	} else if (commandExists("yarn")) {
		await run("yarn", ["global", "add", "@playwright/cli@latest"]);
	} else if (commandExists("npm")) {
		await run("npm", ["install", "-g", "@playwright/cli@latest"]);
	}

	const installSkills =
		(args.installOpenCode && args.opencodeScope === "project") ||
		(args.installCopilot &&
			(args.copilotScope === "project" || args.copilotScope === "both"));
	if (!installSkills) {
		logInfo(
			"Skipping playwright-cli skills install (no project-scope install selected)",
		);
		return;
	}
	try {
		if (commandExists("playwright-cli")) {
			await run("playwright-cli", ["install", "--skills"], { cwd: ROOT });
		} else {
			await runJsPackage("@playwright/cli@latest", ["install", "--skills"], {
				cwd: ROOT,
			});
		}
		logInfo("playwright-cli skills installed into this repo");
	} catch {
		logWarn(
			"playwright-cli skills install failed; try manually: playwright-cli install --skills",
		);
	}
}

async function runJsPackage(pkg, args, options = {}) {
	const runner = resolveRunner();
	switch (runner) {
		case "bunx":
			await run("bunx", ["-y", pkg, ...args], options);
			return;
		case "bunx-fallback":
			await run("bun", ["x", "-y", pkg, ...args], options);
			return;
		case "pnpm":
			await run("pnpm", ["dlx", pkg, ...args], options);
			return;
		case "yarn":
			if (commandExists("npx")) {
				await run(
					"sh",
					[
						"-lc",
						`if yarn dlx --help >/dev/null 2>&1; then yarn dlx ${pkg} ${args.join(" ")}; else npx -y ${pkg} ${args.join(" ")}; fi`,
					],
					options,
				);
				return;
			}
			await run("yarn", ["dlx", pkg, ...args], options);
			return;
		case "npx":
		case "npm-npx":
			await run("npx", ["-y", pkg, ...args], options);
			return;
		default:
			fail("No JS package runner found (bun/pnpm/yarn/npm).");
	}
}

function resolveRunner() {
	if (commandExists("bunx")) return "bunx";
	if (commandExists("bun")) return "bunx-fallback";
	if (commandExists("pnpm")) return "pnpm";
	if (commandExists("yarn")) return "yarn";
	if (commandExists("npx")) return "npx";
	if (commandExists("npm")) return "npm-npx";
	return "none";
}

async function maybeInstallRtk(args) {
	if (args.skipRtk) return;
	if (
		!(
			args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot
		)
	)
		return;

	console.log("\n\x1b[0;32mRTK\x1b[0m");
	if (isCi()) {
		logInfo("CI mode - skipping RTK install");
		return;
	}
	const enabled = await promptToggle(
		args.installClaude &&
			args.installOpenCode &&
			args.installCodex &&
			args.installCopilot
			? "Install RTK for all selected platforms?"
			: "Install RTK support?",
		true,
		false,
	);
	if (!enabled) {
		logWarn("Skipping RTK install");
		return;
	}
	if (!commandExists("rtk")) {
		if (commandExists("brew")) {
			await run("brew", ["install", "rtk-ai/tap/rtk"]);
		} else {
			await run("sh", [
				"-lc",
				"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh",
			]);
		}
	} else {
		logInfo("RTK already installed");
	}
	await writeText(
		PATHS.globalRtkMd,
		`# RTK - Rust Token Killer

Always prefix RTK-supported shell commands with \`rtk\`.

Examples:

\`\`\`bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
\`\`\`

When \`RTK.md\` is present and \`rtk\` is installed, openagentsbtw will enforce RTK-prefixed forms where RTK can rewrite the command.
`,
	);
	logInfo("RTK policy -> ~/.config/openagentsbtw/RTK.md");
}

async function installClaude(args, artifacts) {
	if (!args.installClaude) return;
	console.log("\n\x1b[0;32mClaude Code\x1b[0m");
	await ensureClaudeVersion();
	await ensureNode();
	await ensureJq();
	const models = configureClaudeModels(args.claudePlan);
	const settingsFile = path.join(os.homedir(), ".claude", "settings.json");
	await fs.mkdir(path.dirname(settingsFile), { recursive: true });
	if (!(await pathExists(settingsFile))) {
		await writeText(settingsFile, "{}\n");
		logInfo("Created settings.json");
	} else {
		await fs.copyFile(settingsFile, `${settingsFile}.backup`);
		logInfo("Backed up existing settings.json");
	}
	await run("sh", [
		"-lc",
		`jq '.extraKnownMarketplaces["openagentsbtw"] = {"source": {"source": "github", "repo": "xsyetopz/openagentsbtw"}} | .enabledPlugins["openagentsbtw@openagentsbtw"] = true' "${settingsFile}" > "${settingsFile}.tmp" && mv "${settingsFile}.tmp" "${settingsFile}"`,
	]);
	logInfo("Registered openagentsbtw marketplace");
	const template = path.join(
		artifacts.claudeDir,
		"templates",
		"settings-global.json",
	);
	const tempTemplate = path.join(
		os.tmpdir(),
		`openagentsbtw-claude-${Date.now()}.json`,
	);
	const templateText = (await readText(template))
		.replaceAll("__HOME__", os.homedir())
		.replaceAll("__OPUS_MODEL__", models.opusModel)
		.replaceAll("__SONNET_MODEL__", models.sonnetModel)
		.replaceAll("__HAIKU_MODEL__", models.haikuModel);
	await writeText(tempTemplate, templateText);
	await run("sh", [
		"-lc",
		`jq -s '.[0] as $tpl | .[1] as $usr | $tpl * { env: ($tpl.env * ($usr.env // {})), enabledPlugins: ($tpl.enabledPlugins * ($usr.enabledPlugins // {})), extraKnownMarketplaces: ($tpl.extraKnownMarketplaces * ($usr.extraKnownMarketplaces // {})), mcpServers: (($tpl.mcpServers // {}) * ($usr.mcpServers // {})) } * ($usr | to_entries | map(select(.key as $k | ($tpl | has($k)) | not)) | from_entries)' "${tempTemplate}" "${settingsFile}" > "${settingsFile}.tmp" && mv "${settingsFile}.tmp" "${settingsFile}"`,
	]);
	await run("sh", [
		"-lc",
		`jq --arg m "${models.ccaModel}" '.model = $m' "${settingsFile}" > "${settingsFile}.tmp" && mv "${settingsFile}.tmp" "${settingsFile}"`,
	]);
	await run("sh", [
		"-lc",
		`jq 'def is_legacy(command; args): (.command? == command) and ((.args? // []) == args); def drop_if_legacy(key; command; args): if (.mcpServers? | type == "object") and (.mcpServers[key]? | type == "object") and (.mcpServers[key] | is_legacy(command; args)) then .mcpServers |= del(.[key]) else . end; .mcpServers = (.mcpServers // {}) | drop_if_legacy("chrome-devtools"; "bunx"; ["-y","chrome-devtools-mcp@latest"]) | drop_if_legacy("browsermcp"; "bunx"; ["-y","@browsermcp/mcp@latest"]) | if (.mcpServers | length) == 0 then del(.mcpServers) else . end' "${settingsFile}" > "${settingsFile}.tmp" && mv "${settingsFile}.tmp" "${settingsFile}"`,
	]);
	if (args.deepwikiMcp) {
		await run("sh", [
			"-lc",
			`jq '.mcpServers = (.mcpServers // {}) | .mcpServers.deepwiki = {type: "http", url: "https://mcp.deepwiki.com/mcp", enabled: true}' "${settingsFile}" > "${settingsFile}.tmp" && mv "${settingsFile}.tmp" "${settingsFile}"`,
		]);
		logInfo("DeepWiki MCP -> ~/.claude/settings.json");
	}
	await fs.mkdir(path.join(os.homedir(), ".claude", "hooks"), {
		recursive: true,
	});
	await fs.mkdir(path.join(os.homedir(), ".claude", "output-styles"), {
		recursive: true,
	});
	for (const hook of ["pre-secrets.mjs"]) {
		const source = path.join(artifacts.claudeDir, "hooks", "user", hook);
		if (await pathExists(source)) {
			await fs.copyFile(
				source,
				path.join(os.homedir(), ".claude", "hooks", hook),
			);
			await fs.chmod(path.join(os.homedir(), ".claude", "hooks", hook), 0o755);
		}
	}
	for (const [source, dest] of [
		[
			path.join(artifacts.claudeDir, "output-styles", "cca.md"),
			path.join(os.homedir(), ".claude", "output-styles", "cca.md"),
		],
		[
			path.join(artifacts.claudeDir, "statusline", "statusline-command.sh"),
			path.join(os.homedir(), ".claude", "statusline-command.sh"),
		],
	]) {
		if (await pathExists(source)) {
			await fs.copyFile(source, dest);
			await fs.chmod(dest, 0o755);
		}
	}
	const streamGuard = path.join(os.homedir(), ".streamguardrc.json");
	if (!(await pathExists(streamGuard))) {
		await fs.copyFile(repoPath(".streamguardrc.json.example"), streamGuard);
	}
	if (!isCi()) {
		await run(
			"claude",
			["plugin", "uninstall", "openagentsbtw@openagentsbtw"],
			{
				cwd: ROOT,
			},
		).catch(() => {});
		await run("claude", ["plugin", "uninstall", "openagentsbtw"], {
			cwd: ROOT,
		}).catch(() => {});
		const marketplaceDir = path.join(
			os.homedir(),
			".claude",
			"plugins",
			"marketplaces",
			"openagentsbtw",
		);
		await fs.rm(marketplaceDir, { recursive: true, force: true });
		await fs.mkdir(path.dirname(marketplaceDir), { recursive: true });
		await fs.cp(artifacts.claudeDir, marketplaceDir, { recursive: true });
		await run("claude", ["plugin", "install", "openagentsbtw"], {
			cwd: ROOT,
		}).catch(() =>
			logWarn(
				"Claude plugin install failed - run manually: make install-claude-plugin",
			),
		);
	}
}

async function installOpenCode(args, artifacts) {
	if (!args.installOpenCode) return;
	console.log("\n\x1b[0;32mOpenCode\x1b[0m");
	await ensureBun();
	const commandArgs = [
		"run",
		repoPath("opencode", "src", "cli.ts"),
		"--scope",
		args.opencodeScope,
		"--plugins",
		"inject-preamble,openagentsbtw-core,conventions,safety-guard",
	];
	if (args.opencodeDefaultModel) {
		commandArgs.push("--default-model", args.opencodeDefaultModel);
		logInfo(`OpenCode default model: ${args.opencodeDefaultModel}`);
	} else {
		logInfo("OpenCode models: auto-detect/fallback");
	}
	for (const override of args.opencodeModelOverrides) {
		commandArgs.push("--model", override);
		logInfo(`OpenCode override: ${override}`);
	}
	await run("bun", commandArgs, {
		cwd: ROOT,
		env: {
			OABTW_OPENCODE_TEMPLATES_DIR: artifacts.opencodeTemplatesDir,
			OABTW_OPENCODE_DEEPWIKI: args.deepwikiMcp ? "true" : "false",
			OABTW_COPILOT_PLAN: args.copilotPlan,
		},
	});
	logInfo("OpenCode support installed");
}

async function writeCopilotDeepwiki(target) {
	const existing = await readText(target, "{}");
	let payload = {};
	try {
		payload = JSON.parse(existing);
	} catch {}
	payload.servers ??= {};
	payload.servers.deepwiki = {
		type: "http",
		url: "https://mcp.deepwiki.com/mcp",
	};
	await writeText(target, JSON.stringify(payload, null, 2));
}

async function installCopilot(args, artifacts) {
	if (!args.installCopilot) return;
	console.log("\n\x1b[0;32mGitHub Copilot\x1b[0m");
	await ensureNode();
	const templateRoot = path.join(artifacts.copilotDir, "templates", ".github");
	if (args.copilotScope === "global" || args.copilotScope === "both") {
		const home = path.join(os.homedir(), ".copilot");
		await fs.mkdir(path.join(home, "agents"), { recursive: true });
		await fs.mkdir(path.join(home, "skills"), { recursive: true });
		if (await pathExists(path.join(templateRoot, "agents"))) {
			await fs.cp(
				path.join(templateRoot, "agents"),
				path.join(home, "agents"),
				{
					recursive: true,
				},
			);
		}
		if (await pathExists(path.join(templateRoot, "skills"))) {
			await fs.cp(
				path.join(templateRoot, "skills"),
				path.join(home, "skills"),
				{
					recursive: true,
				},
			);
		}
		logInfo("Copilot agents + skills -> ~/.copilot/");
		if (args.deepwikiMcp) {
			const vscodeUserMcp =
				process.platform === "darwin"
					? path.join(
							os.homedir(),
							"Library",
							"Application Support",
							"Code",
							"User",
							"mcp.json",
						)
					: process.platform === "linux"
						? path.join(
								process.env.XDG_CONFIG_HOME ??
									path.join(os.homedir(), ".config"),
								"Code",
								"User",
								"mcp.json",
							)
						: "";
			if (vscodeUserMcp) {
				await writeCopilotDeepwiki(vscodeUserMcp);
				logInfo(`DeepWiki MCP -> ${vscodeUserMcp}`);
			}
		}
	}
	if (args.copilotScope === "project" || args.copilotScope === "both") {
		const githubRoot = path.join(ROOT, ".github");
		await fs.mkdir(path.join(githubRoot, "hooks", "scripts"), {
			recursive: true,
		});
		await fs.cp(
			path.join(templateRoot, "agents"),
			path.join(githubRoot, "agents"),
			{
				recursive: true,
			},
		);
		await fs.cp(
			path.join(templateRoot, "skills"),
			path.join(githubRoot, "skills"),
			{
				recursive: true,
			},
		);
		await fs.cp(
			path.join(templateRoot, "prompts"),
			path.join(githubRoot, "prompts"),
			{
				recursive: true,
			},
		);
		await fs.copyFile(
			path.join(templateRoot, "hooks", "openagentsbtw.json"),
			path.join(githubRoot, "hooks", "openagentsbtw.json"),
		);
		await fs.cp(
			path.join(artifacts.copilotDir, "hooks", "scripts", "openagentsbtw"),
			path.join(githubRoot, "hooks", "scripts", "openagentsbtw"),
			{ recursive: true },
		);
		await mergeTaggedMarkdown({
			target: path.join(githubRoot, "copilot-instructions.md"),
			template: path.join(templateRoot, "copilot-instructions.md"),
			start: "<!-- >>> openagentsbtw copilot >>> -->",
			end: "<!-- <<< openagentsbtw copilot <<< -->",
		});
		if (args.deepwikiMcp) {
			await writeCopilotDeepwiki(path.join(ROOT, ".vscode", "mcp.json"));
			logInfo("DeepWiki MCP -> .vscode/mcp.json");
		}
		logInfo("Copilot repo assets -> .github/");
	}
}

async function installCodex(args, artifacts) {
	if (!args.installCodex) return;
	console.log("\n\x1b[0;32mCodex\x1b[0m");
	await ensureNode();
	await ensurePython3();
	const codexHome = path.join(os.homedir(), ".codex");
	const agentsHome = path.join(os.homedir(), ".agents");
	const pluginTarget = path.join(codexHome, "plugins", "openagentsbtw");
	const hooksRoot = path.join(codexHome, "openagentsbtw", "hooks");
	const binRoot = path.join(codexHome, "openagentsbtw", "bin");
	const hooksTarget = path.join(codexHome, "hooks.json");
	const marketplaceTarget = path.join(
		agentsHome,
		"plugins",
		"marketplace.json",
	);
	const configTarget = path.join(codexHome, "config.toml");
	const agentsMdTarget = path.join(codexHome, "AGENTS.md");

	await fs.rm(pluginTarget, { recursive: true, force: true });
	await fs.rm(path.join(codexHome, "agents"), { recursive: true, force: true });
	await fs.rm(path.join(hooksRoot, "scripts"), {
		recursive: true,
		force: true,
	});
	await fs.mkdir(pluginTarget, { recursive: true });
	await fs.mkdir(path.join(codexHome, "agents"), { recursive: true });
	await fs.mkdir(path.join(hooksRoot, "scripts"), { recursive: true });
	await fs.mkdir(binRoot, { recursive: true });
	await fs.mkdir(path.dirname(marketplaceTarget), { recursive: true });

	await fs.cp(
		path.join(artifacts.codexDir, "plugin", "openagentsbtw"),
		pluginTarget,
		{
			recursive: true,
		},
	);
	await fs.cp(
		path.join(artifacts.codexDir, "agents"),
		path.join(codexHome, "agents"),
		{
			recursive: true,
		},
	);
	await updateCodexAgents({
		agentsDir: path.join(codexHome, "agents"),
		tier: args.codexPlan,
	});
	await fs.cp(
		path.join(artifacts.codexDir, "hooks", "scripts"),
		path.join(hooksRoot, "scripts"),
		{
			recursive: true,
		},
	);
	for (const wrapper of [
		"openagentsbtw-codex",
		"oabtw-codex",
		"openagentsbtw-codex-peer",
		"oabtw-codex-peer",
	]) {
		await fs.copyFile(
			path.join(artifacts.binDir, wrapper),
			path.join(binRoot, wrapper),
		);
		await fs.chmod(path.join(binRoot, wrapper), 0o755);
	}
	await updateCodexMarketplace({ target: marketplaceTarget });
	await mergeCodexHooks({
		source: path.join(artifacts.codexDir, "hooks", "hooks.json"),
		target: hooksTarget,
	});
	await mergeTaggedMarkdown({
		target: agentsMdTarget,
		template: path.join(artifacts.codexDir, "templates", "AGENTS.md"),
		start: "<!-- >>> openagentsbtw codex >>> -->",
		end: "<!-- <<< openagentsbtw codex <<< -->",
	});
	const profileName = `openagentsbtw-${args.codexPlan}`;
	const configExisting = await readText(configTarget, "");
	const existingProfile = /^[\s]*profile[\s]*=/m.test(configExisting);
	const willSetTopProfile =
		args.codexSetTopProfile === "true" ||
		(args.codexSetTopProfile === "auto" && !existingProfile);
	await mergeCodexConfig({
		target: configTarget,
		profileAction: args.codexSetTopProfile,
		profileName,
		planName: args.codexPlan,
		deepwiki: args.deepwikiMcp,
	});
	if (willSetTopProfile) {
		logInfo(`Codex default profile set to ${profileName}`);
	} else {
		logWarn(
			`Existing Codex default profile preserved; use --profile ${profileName} to activate this system.`,
		);
	}
	logInfo("Codex profile merged into ~/.codex/config.toml");
}

async function validateInstall(args) {
	let errors = 0;
	if (args.installClaude && commandExists("jq")) {
		try {
			await run(
				"jq",
				["empty", path.join(os.homedir(), ".claude", "settings.json")],
				{
					stdio: "ignore",
				},
			);
			logInfo(
				`${path.join(os.homedir(), ".claude", "settings.json")} is valid JSON`,
			);
		} catch {
			errors += 1;
		}
	}
	if (args.installOpenCode) {
		const target =
			args.opencodeScope === "global"
				? path.join(
						process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
						"opencode",
					)
				: path.join(ROOT, ".opencode");
		if (await pathExists(path.join(target, "plugins", "openagentsbtw.ts"))) {
			logInfo("OpenCode plugin installed");
		} else {
			errors += 1;
		}
	}
	if (args.installCodex) {
		for (const filepath of [
			path.join(
				os.homedir(),
				".codex",
				"plugins",
				"openagentsbtw",
				".codex-plugin",
				"plugin.json",
			),
			path.join(os.homedir(), ".codex", "agents", "athena.toml"),
			path.join(os.homedir(), ".codex", "hooks.json"),
		]) {
			if (!(await pathExists(filepath))) errors += 1;
		}
	}
	return errors;
}

function reportSummary(args) {
	console.log("\n\x1b[0;32mopenagentsbtw install complete\x1b[0m\n");
	if (args.installClaude) {
		console.log(
			`  Claude:   openagentsbtw@openagentsbtw (plan ${args.claudePlan})`,
		);
	}
	if (args.installOpenCode) {
		console.log(`  OpenCode: ${args.opencodeScope} install`);
	}
	if (args.installCopilot) {
		console.log(
			`  Copilot:  ${args.copilotScope} install (${args.copilotPlan})`,
		);
	}
	if (args.installCodex) {
		console.log(
			`  Codex:    ~/.codex/plugins/openagentsbtw + ~/.codex/agents (${args.codexPlan})`,
		);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}
	const existingEnv = await loadConfigEnv();
	await ensureSelection(args);
	await promptOptionalSurfaces(args, existingEnv);
	validateArgs(args);
	await writeConfigEnv({
		CONTEXT7_API_KEY: args.context7ApiKey || existingEnv.CONTEXT7_API_KEY || "",
		OABTW_CLAUDE_PLAN: args.claudePlan,
		OABTW_CODEX_PLAN: args.codexPlan || "pro-5",
		OABTW_COPILOT_PLAN: args.copilotPlan,
	});
	console.log("\x1b[0;32mopenagentsbtw installer\x1b[0m");
	const artifacts = await buildArtifacts();
	try {
		await installClaude(args, artifacts);
		await installOpenCode(args, artifacts);
		await installCopilot(args, artifacts);
		await maybeInstallCtx7(args);
		await maybeInstallPlaywright(args);
		await maybeInstallRtk(args);
		await installCodex(args, artifacts);
		const errors = await validateInstall(args);
		reportSummary(args);
		if (errors > 0) {
			throw new Error(`${errors} validation error(s). Check output above.`);
		}
	} finally {
		await fs.rm(artifacts.buildDir, { recursive: true, force: true });
	}
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
