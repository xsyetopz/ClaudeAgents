import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathExists, readText, writeText } from "./shared.mjs";

export function mergeTaggedBlock(text, block, start, end) {
	if (text.includes(start) && text.includes(end)) {
		const [before, rest] = text.split(start, 2);
		const [, after] = rest.split(end, 2);
		return [before.trimEnd(), block.trimEnd(), after.trimStart()]
			.filter(Boolean)
			.join("\n\n");
	}
	return [text.trimEnd(), block.trimEnd()].filter(Boolean).join("\n\n");
}

export async function mergeTaggedMarkdown({ target, template, start, end }) {
	const body = (await readText(template)).trimEnd();
	const existing = await readText(target, "");
	await writeText(
		target,
		mergeTaggedBlock(existing, `${start}\n${body}\n${end}`, start, end),
	);
}

export async function updateCodexAgents({ agentsDir, tier }) {
	const profiles = {
		plus: {
			athena: ["gpt-5.3-codex", "high"],
			hephaestus: ["gpt-5.3-codex", "high"],
			nemesis: ["gpt-5.3-codex", "high"],
			odysseus: ["gpt-5.3-codex", "high"],
			hermes: ["gpt-5.3-codex", "medium"],
			atalanta: ["gpt-5.3-codex", "medium"],
			calliope: ["gpt-5.3-codex", "medium"],
		},
		pro: {
			athena: ["gpt-5.2", "high"],
			hephaestus: ["gpt-5.3-codex", "high"],
			nemesis: ["gpt-5.2", "high"],
			odysseus: ["gpt-5.2", "high"],
			hermes: ["gpt-5.3-codex", "medium"],
			atalanta: ["gpt-5.3-codex", "medium"],
			calliope: ["gpt-5.3-codex", "medium"],
		},
	};
	for (const [agent, [model, reasoning]] of Object.entries(
		profiles[tier] || {},
	)) {
		const filepath = path.join(agentsDir, `${agent}.toml`);
		if (!(await pathExists(filepath))) continue;
		let text = await readText(filepath);
		text = text.replace(/^model = ".*"$/m, `model = "${model}"`);
		text = text.replace(
			/^model_reasoning_effort = ".*"$/m,
			`model_reasoning_effort = "${reasoning}"`,
		);
		await writeText(filepath, text);
	}
}

export async function updateCodexMarketplace({ target }) {
	let payload = {};
	if (await pathExists(target)) {
		try {
			payload = JSON.parse(await readText(target));
		} catch {}
	}
	payload.name ??= "openagentsbtw-local";
	payload.interface ??= {};
	payload.interface.displayName ??= "openagentsbtw Local Marketplace";
	const plugins = Array.isArray(payload.plugins) ? payload.plugins : [];
	payload.plugins = [
		...plugins.filter(
			(entry) =>
				!(entry && typeof entry === "object" && entry.name === "openagentsbtw"),
		),
		{
			name: "openagentsbtw",
			source: { source: "local", path: "./.codex/plugins/openagentsbtw" },
			policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
			category: "Productivity",
		},
	];
	await writeText(target, JSON.stringify(payload, null, 2));
}

export async function mergeCodexHooks({ source, target }) {
	const template = JSON.parse(await readText(source));
	let current = {};
	if (await pathExists(target)) {
		try {
			current = JSON.parse(await readText(target));
		} catch {}
	}
	current.hooks ??= {};
	for (const [event, groups] of Object.entries(current.hooks)) {
		current.hooks[event] = groups.filter((group) => {
			const hooks = Array.isArray(group?.hooks) ? group.hooks : [];
			return !hooks.some(
				(hook) =>
					hook &&
					typeof hook === "object" &&
					typeof hook.command === "string" &&
					hook.command.includes(".codex/openagentsbtw/hooks/scripts/"),
			);
		});
	}
	for (const [event, groups] of Object.entries(template.hooks || {})) {
		current.hooks[event] ??= [];
		current.hooks[event].push(...groups);
	}
	await writeText(target, JSON.stringify(current, null, 2));
}

export function removeManagedBlock(text, start, end) {
	if (!text.includes(start) || !text.includes(end)) return text;
	const [before, rest] = text.split(start, 2);
	const [, after] = rest.split(end, 2);
	return [before.trimEnd(), after.trimStart()].filter(Boolean).join("\n\n");
}

export async function mergeCodexConfig({
	target,
	profileAction,
	profileName,
	deepwiki,
}) {
	const start = "# >>> openagentsbtw codex >>>";
	const end = "# <<< openagentsbtw codex <<<";
	let text = await readText(target, "");

	text = removeManagedBlock(text, start, end);
	text = removeManagedBlock(
		text,
		"# >>> openagentsbtw mcp chrome-devtools >>>",
		"# <<< openagentsbtw mcp chrome-devtools <<<",
	);
	text = removeManagedBlock(
		text,
		"# >>> openagentsbtw mcp browsermcp >>>",
		"# <<< openagentsbtw mcp browsermcp <<<",
	);

	const hasExistingProfile = /^[\s]*profile[\s]*=/m.test(text);
	const setTopProfile =
		profileAction === "true" ||
		(profileAction === "auto" && !hasExistingProfile);

	if (setTopProfile) {
		text = text.replace(/^[\s]*profile[\s]*=.*\n?/gm, "");
	}

	const prefixLines = [];
	const restLines = [];
	let inPrefix = true;
	for (const line of text.split("\n")) {
		if (/^[\s]*\[/.test(line)) inPrefix = false;
		(inPrefix ? prefixLines : restLines).push(line);
	}
	if (setTopProfile) {
		while (prefixLines[0]?.trim() === "") prefixLines.shift();
		prefixLines.unshift(`profile = "${profileName}"`);
	}
	const prefixText = prefixLines.join("\n");
	const commitAttribution = /^[\s]*commit_attribution[\s]*=/m.test(prefixText)
		? ""
		: 'commit_attribution = "Co-Authored-By: Codex <codex@users.noreply.github.com>"\n\n';
	const pluginEntry = /\[plugins\."openagentsbtw@openagentsbtw-local"\]/.test(
		text,
	)
		? ""
		: '\n[plugins."openagentsbtw@openagentsbtw-local"]\nenabled = true\n';
	const deepwikiBlock = deepwiki
		? '\n[mcp_servers.deepwiki]\nurl = "https://mcp.deepwiki.com/mcp"\nenabled = true\n'
		: "";
	const managedBody = `${commitAttribution}[profiles.openagentsbtw-plus]
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-plus.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-pro]
model = "gpt-5.2"
model_reasoning_effort = "xhigh"
plan_mode_reasoning_effort = "xhigh"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-pro.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-frontier]
model = "gpt-5.4"
model_reasoning_effort = "high"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-frontier.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-frontier-mini]
model = "gpt-5.4-mini"
model_reasoning_effort = "medium"
plan_mode_reasoning_effort = "medium"
model_verbosity = "low"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-frontier-mini.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-codex-mini]
model = "gpt-5.3-codex-spark"
model_reasoning_effort = "low"
plan_mode_reasoning_effort = "low"
model_verbosity = "low"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-codex-mini.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw]
model = "gpt-5.2"
model_reasoning_effort = "xhigh"
plan_mode_reasoning_effort = "xhigh"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-accept-edits]
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-accept-edits.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-longrun]
model = "gpt-5.2"
model_reasoning_effort = "xhigh"
plan_mode_reasoning_effort = "xhigh"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
background_terminal_max_timeout = 7200

[profiles.openagentsbtw-longrun.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false
unified_exec = true
prevent_idle_sleep = true${deepwikiBlock}${pluginEntry}`.trimEnd();

	await writeText(
		target,
		[
			prefixLines.join("\n").trim(),
			restLines.join("\n").trim(),
			`${start}\n${managedBody}\n${end}`,
		]
			.filter(Boolean)
			.join("\n\n"),
	);
}

export async function toggleCodexDeepwiki({ target, enabled }) {
	let text = await readText(target, "");
	text = removeManagedBlock(
		text,
		"# >>> openagentsbtw deepwiki >>>",
		"# <<< openagentsbtw deepwiki <<<",
	);
	if (enabled) {
		text = [
			text.trim(),
			'# >>> openagentsbtw deepwiki >>>\n[mcp_servers.deepwiki]\nurl = "https://mcp.deepwiki.com/mcp"\nenabled = true\n# <<< openagentsbtw deepwiki <<<',
		]
			.filter(Boolean)
			.join("\n\n");
	}
	await writeText(target, text);
}

async function main() {
	const command = process.argv[2];
	const arg = (flag) => {
		const index = process.argv.indexOf(flag);
		return index === -1 ? "" : (process.argv[index + 1] ?? "");
	};

	switch (command) {
		case "merge-tagged-markdown":
			await mergeTaggedMarkdown({
				target: arg("--target"),
				template: arg("--template"),
				start: arg("--start"),
				end: arg("--end"),
			});
			break;
		case "update-codex-agents":
			await updateCodexAgents({ agentsDir: arg("--dir"), tier: arg("--tier") });
			break;
		case "update-codex-marketplace":
			await updateCodexMarketplace({ target: arg("--target") });
			break;
		case "merge-codex-hooks":
			await mergeCodexHooks({
				source: arg("--source"),
				target: arg("--target"),
			});
			break;
		case "merge-codex-config":
			await mergeCodexConfig({
				target: arg("--target"),
				profileAction: arg("--profile-action") || "auto",
				profileName: arg("--profile-name") || "openagentsbtw-pro",
				deepwiki: arg("--deepwiki") === "true",
			});
			break;
		case "toggle-codex-deepwiki":
			await toggleCodexDeepwiki({
				target: arg("--target"),
				enabled: arg("--enabled") === "true",
			});
			break;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
