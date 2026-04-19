import { promises as fs } from "node:fs";
import path from "node:path";
import {
	AGENTIC_FULL_HOOKS,
	AGENTIC_FULL_MARKDOWN,
	AGENTIC_FULL_SETTINGS,
	AGENTIC_FULL_TREES,
} from "./agentic-ide-surfaces.mjs";
import { removeManagedBlock } from "./managed-files.mjs";
import {
	removeRtkSurfaces,
	rtkPolicyPathMap,
	rtkReferenceTargets,
} from "./rtk-surfaces.mjs";
import {
	commandExists,
	logInfo,
	logWarn,
	PATHS,
	pathExists,
	ROOT,
	readText,
	removeCodexPluginCaches,
	resolveWorkspacePaths,
	run,
	writeText,
} from "./shared.mjs";

const AGENTIC_IDES = [
	"cursor",
	"junie",
	"air",
	"gemini-cli",
	"kiro",
	"kilo",
	"roo",
	"cline",
	"amp",
	"augment",
	"antigravity",
];

function usage() {
	console.log(`openagentsbtw uninstaller

Usage: ./uninstall.sh [system toggles] [options]

System toggles (allow multiple):
  --claude
  --opencode
  --codex
  --copilot
  --agentic-ides
  --cursor
  --junie
  --air
  --gemini-cli
  --kiro
  --kilo
  --roo
  --cline
  --amp
  --augment
  --antigravity
  --all

Options:
  --opencode-scope project|global
  --copilot-scope global|project|both
  --agentic-ide-scope project|global|both
  -h, --help`);
}

function parseArgs(argv) {
	const args = {
		removeClaude: false,
		removeOpenCode: false,
		removeCodex: false,
		removeCopilot: false,
		removeAgenticIdes: false,
		agenticIdeTargets: [],
		opencodeScope: "global",
		copilotScope: "global",
		agenticIdeScope: "project",
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		switch (token) {
			case "--claude":
				args.removeClaude = true;
				break;
			case "--opencode":
				args.removeOpenCode = true;
				break;
			case "--codex":
				args.removeCodex = true;
				break;
			case "--copilot":
				args.removeCopilot = true;
				break;
			case "--agentic-ides":
				args.removeAgenticIdes = true;
				break;
			case "--cursor":
			case "--junie":
			case "--air":
			case "--gemini-cli":
			case "--kiro":
			case "--kilo":
			case "--roo":
			case "--cline":
			case "--amp":
			case "--augment":
			case "--antigravity":
				args.agenticIdeTargets.push(token.slice(2));
				break;
			case "--all":
				args.removeClaude = true;
				args.removeOpenCode = true;
				args.removeCodex = true;
				args.removeCopilot = true;
				args.removeAgenticIdes = true;
				break;
			case "--opencode-scope":
				args.opencodeScope = argv[++index] ?? "";
				break;
			case "--copilot-scope":
				args.copilotScope = argv[++index] ?? "";
				break;
			case "--agentic-ide-scope":
				args.agenticIdeScope = argv[++index] ?? "";
				break;
			case "-h":
			case "--help":
				args.help = true;
				break;
			default:
				throw new Error(`Unknown argument: ${token}`);
		}
	}

	if (!["global", "project"].includes(args.opencodeScope)) {
		throw new Error(
			`Unsupported OpenCode scope: ${args.opencodeScope} (expected global or project)`,
		);
	}
	if (!["global", "project", "both"].includes(args.copilotScope)) {
		throw new Error(
			`Unsupported Copilot scope: ${args.copilotScope} (expected global, project, or both)`,
		);
	}
	if (!["global", "project", "both"].includes(args.agenticIdeScope)) {
		throw new Error(
			`Unsupported agentic IDE scope: ${args.agenticIdeScope} (expected global, project, or both)`,
		);
	}
	const unknownTargets = args.agenticIdeTargets.filter(
		(target) => !AGENTIC_IDES.includes(target),
	);
	if (unknownTargets.length > 0) {
		throw new Error(
			`Unsupported agentic IDE target: ${unknownTargets.join(", ")}`,
		);
	}

	if (
		!args.removeClaude &&
		!args.removeOpenCode &&
		!args.removeCodex &&
		!args.removeCopilot &&
		!args.removeAgenticIdes &&
		args.agenticIdeTargets.length === 0
	) {
		args.removeClaude = true;
		args.removeOpenCode = true;
		args.removeCodex = true;
		args.removeCopilot = true;
		args.removeAgenticIdes = true;
	}

	return args;
}

async function readJson(target, fallback = {}) {
	try {
		return JSON.parse(await fs.readFile(target, "utf8"));
	} catch {
		return fallback;
	}
}

async function writeJson(target, payload) {
	await writeText(target, JSON.stringify(payload, null, 2));
}

async function removeClaude() {
	console.log("\n\x1b[0;32mRemoving Claude Code support\x1b[0m");
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.claude],
		referenceTargets: rtkReferenceTargets({ claude: true }),
	});
	if (commandExists("claude")) {
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
	}

	await fs.rm(path.join(PATHS.claudeHome, "hooks", "pre-secrets.mjs"), {
		force: true,
	});
	await fs.rm(path.join(PATHS.claudeHome, "hooks", "rtk-rewrite.sh"), {
		force: true,
	});
	await fs.rm(path.join(PATHS.claudeHome, "output-styles", "cca.md"), {
		force: true,
	});
	await fs.rm(path.join(PATHS.claudeHome, "statusline-command.sh"), {
		force: true,
	});
	await fs.rm(
		path.join(PATHS.claudeHome, "plugins", "marketplaces", "openagentsbtw"),
		{
			recursive: true,
			force: true,
		},
	);

	const settingsFile = path.join(PATHS.claudeHome, "settings.json");
	if (await pathExists(settingsFile)) {
		const payload = await readJson(settingsFile, {});
		if (payload.enabledPlugins && typeof payload.enabledPlugins === "object") {
			delete payload.enabledPlugins["openagentsbtw@openagentsbtw"];
			if (Object.keys(payload.enabledPlugins).length === 0) {
				delete payload.enabledPlugins;
			}
		}
		if (
			payload.extraKnownMarketplaces &&
			typeof payload.extraKnownMarketplaces === "object"
		) {
			delete payload.extraKnownMarketplaces.openagentsbtw;
			if (Object.keys(payload.extraKnownMarketplaces).length === 0) {
				delete payload.extraKnownMarketplaces;
			}
		}
		await writeJson(settingsFile, payload);
		logInfo(`Cleaned Claude marketplace settings in ${settingsFile}`);
	}

	logInfo(`Removed Claude plugin files from ${PATHS.claudeHome}`);
}

async function removeOpenCode(scope) {
	console.log("\n\x1b[0;32mRemoving OpenCode support\x1b[0m");
	const workspacePaths = resolveWorkspacePaths();
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.opencode],
		referenceTargets: rtkReferenceTargets({
			opencodeGlobal: scope === "global",
			opencodeProject: scope === "project",
			workspacePaths,
		}),
	});
	const target =
		scope === "global"
			? PATHS.opencodeConfigDir
			: workspacePaths.projectOpenCodeDir;

	for (const agent of [
		"odysseus",
		"athena",
		"hephaestus",
		"nemesis",
		"atalanta",
		"calliope",
		"hermes",
		"argus",
		"orion",
		"prometheus",
	]) {
		await fs.rm(path.join(target, "agents", `${agent}.md`), { force: true });
	}

	for (const command of [
		"openagents-review",
		"openagents-test",
		"openagents-implement",
		"openagents-document",
		"openagents-explore",
		"openagents-trace",
		"openagents-debug",
		"openagents-plan-feature",
		"openagents-plan-refactor",
		"openagents-audit",
		"openagents-orchestrate",
	]) {
		await fs.rm(path.join(target, "commands", `${command}.md`), {
			force: true,
		});
	}

	for (const ctx of [
		"overview",
		"tech-stack",
		"conventions",
		"structure",
		"agent-notes",
	]) {
		await fs.rm(path.join(target, "context", `${ctx}.md`), { force: true });
	}

	await fs.rm(path.join(target, "plugins", "openagentsbtw.ts"), {
		force: true,
	});

	const skillsRoot = path.join(ROOT, "opencode", "templates", "skills");
	if (await pathExists(skillsRoot)) {
		for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			await fs.rm(path.join(target, "skills", entry.name), {
				recursive: true,
				force: true,
			});
		}
	}

	logInfo(`Removed OpenCode files from ${target}`);
	logWarn(
		"OpenCode config keys in opencode.json/jsonc were not edited automatically",
	);
}

async function removeCopilot(scope) {
	console.log("\n\x1b[0;32mRemoving GitHub Copilot support\x1b[0m");
	const workspacePaths = resolveWorkspacePaths();
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.copilot],
		referenceTargets: rtkReferenceTargets({
			copilotGlobal: scope === "global" || scope === "both",
			copilotProject: scope === "project" || scope === "both",
			workspacePaths,
		}),
	});
	const repoTemplateRoot = path.join(ROOT, "copilot", "templates", ".github");
	const userTemplateRoot = path.join(ROOT, "copilot", "templates", ".copilot");
	const skillsRoot = path.join(repoTemplateRoot, "skills");
	const skillDirs = (await pathExists(skillsRoot))
		? (await fs.readdir(skillsRoot, { withFileTypes: true }))
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name)
		: [
				"decide",
				"deslop",
				"document",
				"design-polish",
				"errors",
				"debug",
				"explore",
				"handoff",
				"openagentsbtw",
				"perf",
				"review",
				"security",
				"git-workflow",
				"style",
				"test",
				"trace",
			];

	if (scope === "global" || scope === "both") {
		for (const agent of [
			"athena",
			"hephaestus",
			"nemesis",
			"atalanta",
			"calliope",
			"hermes",
			"odysseus",
		]) {
			await fs.rm(path.join(PATHS.copilotHome, "agents", `${agent}.md`), {
				force: true,
			});
			await fs.rm(path.join(PATHS.copilotHome, "agents", `${agent}.agent.md`), {
				force: true,
			});
		}
		for (const skill of skillDirs) {
			await fs.rm(path.join(PATHS.copilotHome, "skills", skill), {
				recursive: true,
				force: true,
			});
		}
		await fs.rm(path.join(PATHS.copilotHome, "hooks", "openagentsbtw.json"), {
			force: true,
		});
		await fs.rm(path.join(PATHS.copilotHome, "hooks", "route-contracts.json"), {
			force: true,
		});
		await fs.rm(
			path.join(PATHS.copilotHome, "hooks", "scripts", "openagentsbtw"),
			{
				recursive: true,
				force: true,
			},
		);
		const userInstructionsRoot = path.join(userTemplateRoot, "instructions");
		if (await pathExists(userInstructionsRoot)) {
			for (const entry of await fs.readdir(userInstructionsRoot, {
				withFileTypes: true,
			})) {
				if (!entry.isFile()) continue;
				await fs.rm(path.join(PATHS.copilotHome, "instructions", entry.name), {
					force: true,
				});
			}
		}
		const globalInstructionsTarget = path.join(
			PATHS.copilotHome,
			"copilot-instructions.md",
		);
		if (await pathExists(globalInstructionsTarget)) {
			const next = removeManagedBlock(
				await readText(globalInstructionsTarget, ""),
				"<!-- >>> openagentsbtw copilot >>> -->",
				"<!-- <<< openagentsbtw copilot <<< -->",
			);
			await writeText(globalInstructionsTarget, next);
		}
		logInfo(
			`Removed Copilot global agents, skills, hooks, and instructions from ${PATHS.copilotHome}`,
		);
	}

	if (scope === "project" || scope === "both") {
		const workspacePaths = resolveWorkspacePaths();
		const ghRoot = workspacePaths.projectGithubDir;
		for (const agent of [
			"athena",
			"hephaestus",
			"nemesis",
			"atalanta",
			"calliope",
			"hermes",
			"odysseus",
		]) {
			await fs.rm(path.join(ghRoot, "agents", `${agent}.md`), { force: true });
			await fs.rm(path.join(ghRoot, "agents", `${agent}.agent.md`), {
				force: true,
			});
		}
		for (const skill of skillDirs) {
			await fs.rm(path.join(ghRoot, "skills", skill), {
				recursive: true,
				force: true,
			});
		}
		const promptsRoot = path.join(repoTemplateRoot, "prompts");
		if (await pathExists(promptsRoot)) {
			for (const entry of await fs.readdir(promptsRoot, {
				withFileTypes: true,
			})) {
				if (!entry.isFile()) continue;
				await fs.rm(path.join(ghRoot, "prompts", entry.name), { force: true });
			}
		}
		await fs.rm(path.join(ghRoot, "hooks", "openagentsbtw.json"), {
			force: true,
		});
		await fs.rm(path.join(ghRoot, "hooks", "openagesbtw.json"), {
			force: true,
		});
		await fs.rm(path.join(ghRoot, "hooks", "route-contracts.json"), {
			force: true,
		});
		await fs.rm(path.join(ghRoot, "hooks", "scripts", "openagentsbtw"), {
			recursive: true,
			force: true,
		});
		const repoInstructionsRoot = path.join(repoTemplateRoot, "instructions");
		if (await pathExists(repoInstructionsRoot)) {
			for (const entry of await fs.readdir(repoInstructionsRoot, {
				withFileTypes: true,
			})) {
				if (!entry.isFile()) continue;
				await fs.rm(path.join(ghRoot, "instructions", entry.name), {
					force: true,
				});
			}
		}

		const instructionsTarget = path.join(ghRoot, "copilot-instructions.md");
		if (await pathExists(instructionsTarget)) {
			const next = removeManagedBlock(
				await readText(instructionsTarget, ""),
				"<!-- >>> openagentsbtw copilot >>> -->",
				"<!-- <<< openagentsbtw copilot <<< -->",
			);
			await writeText(instructionsTarget, next);
		}
		logInfo("Removed Copilot repo assets from .github/");
	}
}

function selectedAgenticIdes(args) {
	return args.removeAgenticIdes
		? AGENTIC_IDES
		: [...new Set(args.agenticIdeTargets)];
}

async function removeManagedMarkdown(target, name) {
	if (!(await pathExists(target))) return;
	const next = removeManagedBlock(
		await readText(target, ""),
		`<!-- >>> openagentsbtw ${name} >>> -->`,
		`<!-- <<< openagentsbtw ${name} <<< -->`,
	);
	await writeText(target, next);
}

async function listFiles(root, base = root) {
	let files = [];
	for (const entry of await fs
		.readdir(root, { withFileTypes: true })
		.catch(() => [])) {
		const fullPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			files = files.concat(await listFiles(fullPath, base));
			continue;
		}
		files.push(path.relative(base, fullPath));
	}
	return files;
}

async function removeTemplateTree({ source, target }) {
	for (const relativePath of await listFiles(source)) {
		await fs.rm(path.join(target, relativePath), { force: true });
	}
	await fs.rm(path.join(target, ".openagentsbtw-install-manifest.json"), {
		force: true,
	});
}

async function removeManagedIgnore(target, name) {
	if (!(await pathExists(target))) return;
	const next = removeManagedBlock(
		await readText(target, ""),
		`# >>> openagentsbtw ${name} >>>`,
		`# <<< openagentsbtw ${name} <<<`,
	);
	await writeText(target, next);
}

async function removeAgenticSettings(target, serverKey = "mcpServers") {
	if (!(await pathExists(target))) return;
	const payload = await readJson(target, {});
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
	const metadata =
		payload.openagentsbtw && typeof payload.openagentsbtw === "object"
			? payload.openagentsbtw
			: null;
	if (!metadata?.managed) return;
	const next = { ...payload };
	const managedServers = Array.isArray(metadata.managedMcpServers)
		? metadata.managedMcpServers.filter((name) => typeof name === "string")
		: [];
	delete next.openagentsbtw;
	if (next[serverKey] && typeof next[serverKey] === "object") {
		for (const server of managedServers) {
			delete next[serverKey][server];
		}
		if (Object.keys(next[serverKey]).length === 0) {
			delete next[serverKey];
		}
	}
	await writeJson(target, next);
}

async function removeAgenticGuardIfUnused({ guardPath, hookPaths }) {
	for (const hookPath of hookPaths) {
		if (await pathExists(hookPath)) return;
	}
	await fs.rm(guardPath, { force: true });
}

function fullSurfaceTemplate(root, surface) {
	return path.join(root, ...surface.templatePath);
}

function fullProjectTarget(workspacePaths, surface) {
	return path.join(workspacePaths.workspaceRoot, ...surface.projectTarget);
}

function fullGlobalTarget(surface) {
	return path.join(PATHS[surface.globalHome], ...surface.globalTarget);
}

function selectedFullHookTargets({ targets, scope, workspacePaths }) {
	return AGENTIC_FULL_HOOKS.filter(
		(surface) =>
			targets.includes(surface.tool) &&
			(scope === "project" ? surface.projectTarget : surface.globalHome),
	).map((surface) =>
		scope === "project"
			? fullProjectTarget(workspacePaths, surface)
			: fullGlobalTarget(surface),
	);
}

function allFullHookTargets({ scope, workspacePaths }) {
	return AGENTIC_FULL_HOOKS.filter((surface) =>
		scope === "project" ? surface.projectTarget : surface.globalHome,
	).map((surface) =>
		scope === "project"
			? fullProjectTarget(workspacePaths, surface)
			: fullGlobalTarget(surface),
	);
}

async function removeFullProjectAgenticIdes(targets) {
	const workspacePaths = resolveWorkspacePaths();
	const root = path.join(ROOT, "agentic-ides", "templates", "full", "project");
	const guardPath = path.join(
		workspacePaths.workspaceRoot,
		".openagentsbtw",
		"agentic",
		"hooks",
		"openagentsbtw-agentic-guard.mjs",
	);
	for (const surface of AGENTIC_FULL_SETTINGS) {
		if (!targets.includes(surface.tool) || !surface.projectTarget) continue;
		await removeAgenticSettings(
			fullProjectTarget(workspacePaths, surface),
			surface.serverKey,
		);
	}
	for (const surface of AGENTIC_FULL_TREES) {
		if (!targets.includes(surface.tool) || !surface.projectTarget) continue;
		await removeTemplateTree({
			source: fullSurfaceTemplate(root, surface),
			target: fullProjectTarget(workspacePaths, surface),
		});
	}
	for (const hookTarget of selectedFullHookTargets({
		targets,
		scope: "project",
		workspacePaths,
	})) {
		await fs.rm(hookTarget, { force: true });
	}
	for (const surface of AGENTIC_FULL_MARKDOWN) {
		if (!targets.includes(surface.tool) || !surface.projectTarget) continue;
		await removeManagedMarkdown(
			fullProjectTarget(workspacePaths, surface),
			surface.markerName,
		);
	}
	await removeAgenticGuardIfUnused({
		guardPath,
		hookPaths: allFullHookTargets({ scope: "project", workspacePaths }),
	});
}

async function removeFullGlobalAgenticIdes(targets) {
	const root = path.join(ROOT, "agentic-ides", "templates", "full", "global");
	const guardPath = path.join(
		PATHS.configDir,
		"agentic",
		"hooks",
		"openagentsbtw-agentic-guard.mjs",
	);
	for (const surface of AGENTIC_FULL_SETTINGS) {
		if (!targets.includes(surface.tool) || !surface.globalHome) continue;
		await removeAgenticSettings(fullGlobalTarget(surface), surface.serverKey);
	}
	for (const surface of AGENTIC_FULL_TREES) {
		if (!targets.includes(surface.tool) || !surface.globalHome) continue;
		await removeTemplateTree({
			source: fullSurfaceTemplate(root, surface),
			target: fullGlobalTarget(surface),
		});
	}
	for (const hookTarget of selectedFullHookTargets({
		targets,
		scope: "global",
	})) {
		await fs.rm(hookTarget, { force: true });
	}
	await removeAgenticGuardIfUnused({
		guardPath,
		hookPaths: allFullHookTargets({ scope: "global" }),
	});
}

async function removeNativeProjectAgenticIdes(targets) {
	const workspacePaths = resolveWorkspacePaths();
	const root = path.join(
		ROOT,
		"agentic-ides",
		"templates",
		"native",
		"project",
	);
	if (targets.includes("gemini-cli")) {
		await removeTemplateTree({
			source: path.join(root, "gemini-cli", ".gemini", "agents"),
			target: path.join(workspacePaths.workspaceRoot, ".gemini", "agents"),
		});
		await removeTemplateTree({
			source: path.join(root, "gemini-cli", ".gemini", "commands", "oabtw"),
			target: path.join(
				workspacePaths.workspaceRoot,
				".gemini",
				"commands",
				"oabtw",
			),
		});
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".geminiignore"),
			"agentic-ides ignore",
		);
	}
	if (targets.includes("augment")) {
		for (const dir of ["agents", "commands", "skills"]) {
			await removeTemplateTree({
				source: path.join(root, "augment", ".augment", dir),
				target: path.join(workspacePaths.workspaceRoot, ".augment", dir),
			});
		}
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".augmentignore"),
			"agentic-ides ignore",
		);
	}
	if (targets.includes("kiro")) {
		await removeTemplateTree({
			source: path.join(root, "kiro", ".kiro", "agents"),
			target: path.join(workspacePaths.workspaceRoot, ".kiro", "agents"),
		});
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".kiroignore"),
			"agentic-ides ignore",
		);
	}
	if (targets.includes("kilo")) {
		await removeTemplateTree({
			source: path.join(root, "kilo", ".kilocode", "skills"),
			target: path.join(workspacePaths.workspaceRoot, ".kilocode", "skills"),
		});
		await fs.rm(
			path.join(
				workspacePaths.workspaceRoot,
				".kilocodemodes.openagentsbtw.md",
			),
			{ force: true },
		);
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".kilocodeignore"),
			"agentic-ides ignore",
		);
	}
	if (targets.includes("cline")) {
		await removeTemplateTree({
			source: path.join(root, "cline", ".cline", "skills"),
			target: path.join(workspacePaths.workspaceRoot, ".cline", "skills"),
		});
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".clineignore"),
			"agentic-ides ignore",
		);
	}
	if (targets.includes("roo")) {
		for (const dir of ["rules-code", "rules-architect", "rules-debug"]) {
			await removeTemplateTree({
				source: path.join(root, "roo", ".roo", dir),
				target: path.join(workspacePaths.workspaceRoot, ".roo", dir),
			});
		}
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".rooignore"),
			"agentic-ides ignore",
		);
	}
	if (targets.includes("cursor")) {
		for (const file of [".cursorignore", ".cursorindexingignore"]) {
			await removeManagedIgnore(
				path.join(workspacePaths.workspaceRoot, file),
				"agentic-ides ignore",
			);
		}
	}
	if (targets.includes("junie")) {
		await removeManagedIgnore(
			path.join(workspacePaths.workspaceRoot, ".aiignore"),
			"agentic-ides ignore",
		);
	}
}

async function removeNativeGlobalAgenticIdes(targets) {
	const root = path.join(ROOT, "agentic-ides", "templates", "native", "global");
	if (targets.includes("gemini-cli")) {
		await removeTemplateTree({
			source: path.join(root, "gemini-cli", ".gemini", "agents"),
			target: path.join(PATHS.geminiHome, "agents"),
		});
		await removeTemplateTree({
			source: path.join(root, "gemini-cli", ".gemini", "commands", "oabtw"),
			target: path.join(PATHS.geminiHome, "commands", "oabtw"),
		});
	}
	if (targets.includes("augment")) {
		for (const dir of ["agents", "commands", "skills"]) {
			await removeTemplateTree({
				source: path.join(root, "augment", ".augment", dir),
				target: path.join(PATHS.augmentHome, dir),
			});
		}
	}
	if (targets.includes("kiro")) {
		await removeTemplateTree({
			source: path.join(root, "kiro", ".kiro", "agents"),
			target: path.join(PATHS.kiroHome, "agents"),
		});
	}
	if (targets.includes("kilo")) {
		await removeTemplateTree({
			source: path.join(root, "kilo", ".kilocode", "skills"),
			target: path.join(PATHS.kiloRulesHome, "skills"),
		});
		await fs.rm(
			path.join(PATHS.kiloRulesHome, ".kilocodemodes.openagentsbtw.md"),
			{ force: true },
		);
	}
	if (targets.includes("cline")) {
		await removeTemplateTree({
			source: path.join(root, "cline", ".cline", "skills"),
			target: path.join(PATHS.clineHome, "Skills"),
		});
	}
	if (targets.includes("roo")) {
		for (const dir of ["rules-code", "rules-architect", "rules-debug"]) {
			await removeTemplateTree({
				source: path.join(root, "roo", ".roo", dir),
				target: path.join(PATHS.rooHome, dir),
			});
		}
	}
}

async function removeProjectAgenticIdes(targets) {
	await removeFullProjectAgenticIdes(targets);
	await removeNativeProjectAgenticIdes(targets);
	const workspacePaths = resolveWorkspacePaths();
	if (targets.includes("cursor")) {
		await fs.rm(
			path.join(workspacePaths.projectCursorRulesDir, "openagentsbtw.mdc"),
			{ force: true },
		);
	}
	if (targets.includes("junie")) {
		await fs.rm(path.join(workspacePaths.projectJunieDir, "AGENTS.md"), {
			force: true,
		});
	}
	if (targets.some((target) => ["air", "amp", "kilo"].includes(target))) {
		await removeManagedMarkdown(
			path.join(workspacePaths.workspaceRoot, "AGENTS.md"),
			"agentic-ides",
		);
	}
	if (targets.some((target) => ["gemini-cli"].includes(target))) {
		await removeManagedMarkdown(
			path.join(workspacePaths.workspaceRoot, "GEMINI.md"),
			"agentic-ides gemini",
		);
	}
	if (targets.includes("kiro")) {
		await fs.rm(
			path.join(workspacePaths.projectKiroSteeringDir, "openagentsbtw.md"),
			{ force: true },
		);
	}
	if (targets.includes("kilo")) {
		await fs.rm(
			path.join(workspacePaths.projectKiloRulesDir, "openagentsbtw.md"),
			{ force: true },
		);
	}
	if (targets.includes("roo")) {
		await fs.rm(
			path.join(workspacePaths.projectRooRulesDir, "openagentsbtw.md"),
			{ force: true },
		);
	}
	if (targets.includes("cline")) {
		await fs.rm(
			path.join(workspacePaths.projectClineRulesDir, "openagentsbtw.md"),
			{ force: true },
		);
	}
	if (targets.includes("augment")) {
		await fs.rm(
			path.join(workspacePaths.projectAugmentRulesDir, "openagentsbtw.md"),
			{ force: true },
		);
	}
}

async function removeGlobalAgenticIdes(targets) {
	await removeFullGlobalAgenticIdes(targets);
	await removeNativeGlobalAgenticIdes(targets);
	if (targets.includes("gemini-cli")) {
		await removeManagedMarkdown(
			path.join(PATHS.geminiHome, "GEMINI.md"),
			"agentic-ides gemini",
		);
	}
	if (targets.includes("kiro")) {
		await fs.rm(path.join(PATHS.kiroHome, "steering", "openagentsbtw.md"), {
			force: true,
		});
	}
	if (targets.includes("kilo")) {
		await fs.rm(path.join(PATHS.kiloRulesHome, "rules", "openagentsbtw.md"), {
			force: true,
		});
		await removeManagedMarkdown(
			path.join(PATHS.kiloConfigDir, "AGENTS.md"),
			"agentic-ides",
		);
	}
	if (targets.includes("roo")) {
		await fs.rm(path.join(PATHS.rooHome, "rules", "openagentsbtw.md"), {
			force: true,
		});
	}
	if (targets.includes("cline")) {
		await fs.rm(path.join(PATHS.clineRulesDir, "openagentsbtw.md"), {
			force: true,
		});
	}
	if (targets.includes("amp")) {
		await removeManagedMarkdown(
			path.join(PATHS.ampConfigDir, "AGENTS.md"),
			"agentic-ides",
		);
	}
	if (targets.includes("augment")) {
		await fs.rm(path.join(PATHS.augmentHome, "rules", "openagentsbtw.md"), {
			force: true,
		});
	}
}

async function removeAgenticIdes(args) {
	const targets = selectedAgenticIdes(args);
	if (targets.length === 0) return;
	console.log("\n\x1b[0;32mRemoving agentic IDE support\x1b[0m");
	if (args.agenticIdeScope === "project" || args.agenticIdeScope === "both") {
		await removeProjectAgenticIdes(targets);
	}
	if (args.agenticIdeScope === "global" || args.agenticIdeScope === "both") {
		await removeGlobalAgenticIdes(targets);
	}
	logInfo("Removed agentic IDE rules/instructions");
}

async function removeCodex() {
	console.log("\n\x1b[0;32mRemoving Codex support\x1b[0m");
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.codex],
		referenceTargets: rtkReferenceTargets({ codex: true }),
	});
	await fs.rm(path.join(PATHS.codexHome, "plugins", "openagentsbtw"), {
		recursive: true,
		force: true,
	});
	await removeCodexPluginCaches(PATHS.codexHome);
	await fs.rm(path.join(PATHS.codexHome, "openagentsbtw"), {
		recursive: true,
		force: true,
	});
	for (const wrapper of [
		"openagentsbtw-codex",
		"oabtw-codex",
		"openagentsbtw-codex-peer",
		"oabtw-codex-peer",
	]) {
		await fs.rm(path.join(PATHS.managedBinDir, wrapper), { force: true });
		await fs.rm(path.join(PATHS.managedBinDir, `${wrapper}.ps1`), {
			force: true,
		});
		await fs.rm(path.join(PATHS.managedBinDir, `${wrapper}.cmd`), {
			force: true,
		});
	}

	for (const agent of [
		"athena",
		"hephaestus",
		"nemesis",
		"atalanta",
		"calliope",
		"hermes",
		"odysseus",
	]) {
		const agentFile = path.join(PATHS.codexHome, "agents", `${agent}.toml`);
		if (!(await pathExists(agentFile))) continue;
		const text = await readText(agentFile, "");
		if (text.includes("openagentsbtw managed file")) {
			await fs.rm(agentFile, { force: true });
		}
	}

	const hooksTarget = path.join(PATHS.codexHome, "hooks.json");
	if (await pathExists(hooksTarget)) {
		const payload = await readJson(hooksTarget, {});
		payload.hooks ??= {};
		for (const [event, groups] of Object.entries(payload.hooks)) {
			const filtered = Array.isArray(groups)
				? groups.filter((group) => {
						const hooks = Array.isArray(group?.hooks) ? group.hooks : [];
						return !hooks.some(
							(hook) =>
								hook &&
								typeof hook === "object" &&
								typeof hook.command === "string" &&
								hook.command.includes(".codex/openagentsbtw/hooks/scripts/"),
						);
					})
				: [];
			if (filtered.length > 0) {
				payload.hooks[event] = filtered;
			} else {
				delete payload.hooks[event];
			}
		}
		await writeJson(hooksTarget, payload);
	}

	const marketplaceTarget = path.join(
		PATHS.agentsHome,
		"plugins",
		"marketplace.json",
	);
	if (await pathExists(marketplaceTarget)) {
		const payload = await readJson(marketplaceTarget, {});
		const plugins = Array.isArray(payload.plugins) ? payload.plugins : [];
		payload.plugins = plugins.filter(
			(entry) =>
				!(entry && typeof entry === "object" && entry.name === "openagentsbtw"),
		);
		await writeJson(marketplaceTarget, payload);
	}

	for (const target of [
		path.join(PATHS.codexHome, "AGENTS.md"),
		path.join(PATHS.codexHome, "config.toml"),
	]) {
		if (!(await pathExists(target))) continue;
		const next = target.endsWith("AGENTS.md")
			? removeManagedBlock(
					await readText(target, ""),
					"<!-- >>> openagentsbtw codex >>> -->",
					"<!-- <<< openagentsbtw codex <<< -->",
				)
			: removeManagedBlock(
					await readText(target, ""),
					"# >>> openagentsbtw codex >>>",
					"# <<< openagentsbtw codex <<<",
				);
		await writeText(target, next);
	}

	logInfo("Removed Codex plugin, agents, hooks, and managed profile blocks");
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}

	if (args.removeClaude) await removeClaude();
	if (args.removeOpenCode) await removeOpenCode(args.opencodeScope);
	if (args.removeCopilot) await removeCopilot(args.copilotScope);
	await removeAgenticIdes(args);
	if (args.removeCodex) await removeCodex();

	console.log("\n\x1b[0;32mopenagentsbtw uninstall complete\x1b[0m");
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
