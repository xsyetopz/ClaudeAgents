import { promises as fs } from "node:fs";
import { toggleCodexDeepwiki } from "./managed-files.mjs";
import {
	commandExists,
	ctx7RunnerLine,
	loadConfigEnv,
	logInfo,
	PATHS,
	pathExists,
	promptText,
	run,
	writeConfigEnv,
	writeText,
} from "./shared.mjs";

const DEEPWIKI_URL = "https://mcp.deepwiki.com/mcp";

function usage() {
	console.log(`openagentsbtw config

Usage: ./config.sh [options]

  --ctx7                 Install/update the managed ctx7 wrapper
  --no-ctx7              Remove the managed ctx7 wrapper
  --ctx7-api-key [KEY]   Set or update CONTEXT7_API_KEY (prompt if omitted)
  --deepwiki             Enable managed DeepWiki config on installed surfaces
  --no-deepwiki          Disable managed DeepWiki config on installed surfaces
  --rtk                  Install RTK if needed and write the managed global RTK.md
  --no-rtk               Remove the managed global RTK.md
  --yes                  Accept default prompts without asking
  -h, --help             Show this help`);
}

async function installCtx7Wrapper() {
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
	logInfo(`Installed managed ctx7 wrapper at ${PATHS.ctx7Wrapper}`);
}

async function removeCtx7Wrapper() {
	await fs.rm(PATHS.ctx7Wrapper, { force: true });
	logInfo("Removed managed ctx7 wrapper");
}

async function ensureRtkBinary() {
	if (commandExists("rtk")) {
		logInfo("RTK already installed");
		return;
	}
	if (commandExists("brew")) {
		await run("brew", ["install", "rtk-ai/tap/rtk"]);
		return;
	}
	await run("sh", [
		"-lc",
		"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh",
	]);
}

async function writeGlobalRtkMd() {
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
	logInfo(`Installed managed RTK policy at ${PATHS.globalRtkMd}`);
}

async function removeGlobalRtkMd() {
	await fs.rm(PATHS.globalRtkMd, { force: true });
	logInfo("Removed managed RTK policy");
}

function parseJsonc(text) {
	const cleaned = text
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, (match, offset, fullText) => {
			const preceding = fullText.slice(0, offset);
			const quoteCount = (preceding.match(/"/g) || []).length;
			if (quoteCount % 2 === 1) {
				return match;
			}
			return "";
		});
	return JSON.parse(cleaned);
}

async function updateJsonFile(target, mutate, { create = false } = {}) {
	if (!create && !(await pathExists(target))) {
		return false;
	}
	const existing = await readJsonFile(target, create ? "{}" : "");
	const next = mutate(existing);
	await writeText(target, JSON.stringify(next, null, 2));
	return true;
}

async function readJsonFile(target, fallback = "{}") {
	try {
		return JSON.parse(await fs.readFile(target, "utf8"));
	} catch {
		return JSON.parse(fallback);
	}
}

async function updateJsoncFile(target, mutate) {
	if (!(await pathExists(target))) {
		return false;
	}
	const source = await fs.readFile(target, "utf8");
	const existing = parseJsonc(source);
	const next = mutate(existing);
	await writeText(target, JSON.stringify(next, null, 2));
	return true;
}

function resolveCopilotUserMcpPath() {
	if (process.platform === "darwin") {
		return `${process.env.HOME ?? ""}/Library/Application Support/Code/User/mcp.json`;
	}
	if (process.platform === "linux") {
		const configHome =
			process.env.XDG_CONFIG_HOME ?? `${process.env.HOME ?? ""}/.config`;
		return `${configHome}/Code/User/mcp.json`;
	}
	return "";
}

function enableDeepwikiServer(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	next.servers ??= {};
	next.servers.deepwiki = { type: "http", url: DEEPWIKI_URL };
	return next;
}

function disableDeepwikiServer(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	if (next.servers && typeof next.servers === "object") {
		next.servers = { ...next.servers };
		delete next.servers.deepwiki;
		if (Object.keys(next.servers).length === 0) {
			delete next.servers;
		}
	}
	return next;
}

function enableOpenCodeDeepwiki(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	const currentMcp =
		next.mcp && typeof next.mcp === "object" ? { ...next.mcp } : {};
	currentMcp.deepwiki = {
		type: "remote",
		url: DEEPWIKI_URL,
		enabled: true,
	};
	next.mcp = currentMcp;
	return next;
}

function disableOpenCodeDeepwiki(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	if (next.mcp && typeof next.mcp === "object") {
		next.mcp = { ...next.mcp };
		delete next.mcp.deepwiki;
		if (Object.keys(next.mcp).length === 0) {
			delete next.mcp;
		}
	}
	return next;
}

async function toggleClaudeDeepwiki(enabled) {
	const target = `${process.env.HOME ?? ""}/.claude/settings.json`;
	const changed = await updateJsonFile(target, (payload) => {
		const next = payload && typeof payload === "object" ? { ...payload } : {};
		next.mcpServers =
			next.mcpServers && typeof next.mcpServers === "object"
				? { ...next.mcpServers }
				: {};
		if (enabled) {
			next.mcpServers.deepwiki = {
				type: "http",
				url: DEEPWIKI_URL,
				enabled: true,
			};
		} else {
			delete next.mcpServers.deepwiki;
			if (Object.keys(next.mcpServers).length === 0) {
				delete next.mcpServers;
			}
		}
		return next;
	});
	if (changed) {
		logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${target}`);
	}
}

async function toggleOpenCodeDeepwiki(enabled) {
	const home = process.env.HOME ?? "";
	const configHome = process.env.XDG_CONFIG_HOME ?? `${home}/.config`;
	for (const target of [
		`${process.cwd()}/opencode.jsonc`,
		`${process.cwd()}/opencode.json`,
		`${configHome}/opencode/opencode.jsonc`,
		`${configHome}/opencode/opencode.json`,
	]) {
		const changed = target.endsWith(".jsonc")
			? await updateJsoncFile(
					target,
					enabled ? enableOpenCodeDeepwiki : disableOpenCodeDeepwiki,
				)
			: await updateJsonFile(
					target,
					enabled ? enableOpenCodeDeepwiki : disableOpenCodeDeepwiki,
				);
		if (changed) {
			logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${target}`);
		}
	}
}

async function toggleCopilotDeepwiki(enabled) {
	const projectInstalled =
		(await pathExists(`${process.cwd()}/.github/agents`)) ||
		(await pathExists(`${process.cwd()}/.github/hooks/openagentsbtw.json`));
	if (projectInstalled) {
		const target = `${process.cwd()}/.vscode/mcp.json`;
		await updateJsonFile(
			target,
			enabled ? enableDeepwikiServer : disableDeepwikiServer,
			{ create: enabled },
		);
		logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${target}`);
	}

	const copilotHome = `${process.env.HOME ?? ""}/.copilot`;
	const userMcpPath = resolveCopilotUserMcpPath();
	if (
		userMcpPath &&
		((await pathExists(copilotHome)) || (await pathExists(userMcpPath)))
	) {
		await updateJsonFile(
			userMcpPath,
			enabled ? enableDeepwikiServer : disableDeepwikiServer,
			{ create: enabled },
		);
		logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${userMcpPath}`);
	}
}

async function toggleDeepwikiEverywhere(enabled) {
	await toggleCodexDeepwiki({ target: PATHS.codexConfig, enabled });
	logInfo(
		`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${PATHS.codexConfig}`,
	);
	await toggleClaudeDeepwiki(enabled);
	await toggleOpenCodeDeepwiki(enabled);
	await toggleCopilotDeepwiki(enabled);
}

function parseArgs(argv) {
	return {
		ctx7: argv.includes("--ctx7"),
		noCtx7: argv.includes("--no-ctx7"),
		deepwiki: argv.includes("--deepwiki"),
		noDeepwiki: argv.includes("--no-deepwiki"),
		rtk: argv.includes("--rtk"),
		noRtk: argv.includes("--no-rtk"),
		yes: argv.includes("--yes"),
		help: argv.includes("-h") || argv.includes("--help"),
		ctx7ApiKeyIndex: argv.indexOf("--ctx7-api-key"),
		argv,
	};
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}

	const existingEnv = await loadConfigEnv();
	let context7ApiKey = existingEnv.CONTEXT7_API_KEY || "";

	if (args.ctx7ApiKeyIndex !== -1) {
		const explicit = args.argv[args.ctx7ApiKeyIndex + 1];
		context7ApiKey =
			explicit && !explicit.startsWith("--")
				? explicit
				: await promptText("Context7 API key:", args.yes, "");
		await writeConfigEnv({ CONTEXT7_API_KEY: context7ApiKey });
		logInfo(`Updated ${PATHS.configEnvFile}`);
	}

	if (args.ctx7) {
		await installCtx7Wrapper();
	}
	if (args.noCtx7) {
		await removeCtx7Wrapper();
	}
	if (args.deepwiki) {
		await toggleDeepwikiEverywhere(true);
	}
	if (args.noDeepwiki) {
		await toggleDeepwikiEverywhere(false);
	}
	if (args.rtk) {
		await ensureRtkBinary();
		await writeGlobalRtkMd();
	}
	if (args.noRtk) {
		await removeGlobalRtkMd();
	}

	if (
		!args.ctx7 &&
		!args.noCtx7 &&
		!args.deepwiki &&
		!args.noDeepwiki &&
		!args.rtk &&
		!args.noRtk &&
		args.ctx7ApiKeyIndex === -1
	) {
		usage();
		return;
	}
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
