#!/usr/bin/env bun
import { resolve } from "node:path";
import { runAcceptCommand } from "./commands/accept";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runRenderCommand } from "./commands/render";
import { runRoadmapEvidenceCommand } from "./commands/roadmap-evidence";
import { runRtkGainCommand } from "./commands/rtk-gain";
import { runToolchainCommand } from "./commands/toolchain";
import { runUninstallCommand } from "./commands/uninstall";

const repoRoot = resolve(import.meta.dir, "../../..");
const [command, ...args] = process.argv.slice(2);

if (!command || command === "help") usage();
if (command === "accept") await runAcceptCommand(repoRoot);
else if (command === "check") await runCheckCommand(repoRoot);
else if (command === "render" || command === "generate")
	await runRenderCommand(repoRoot, args);
else if (command === "preview") await runPreviewCommand(repoRoot, args);
else if (command === "deploy") await runDeployCommand(repoRoot, args);
else if (command === "uninstall") await runUninstallCommand(args);
else if (command === "plugins") await runPluginsCommand(repoRoot, args);
else if (command === "toolchain") await runToolchainCommand(args);
else if (command === "rtk-gain") await runRtkGainCommand(repoRoot, args);
else if (command === "roadmap-evidence")
	await runRoadmapEvidenceCommand(repoRoot);
else usage();

function usage(): never {
	console.log(
		"Usage: oal accept|roadmap-evidence|rtk-gain [--allow-empty-history]|check|preview [--provider all|codex|claude|opencode] [--path artifact] [--content]|render|generate [--provider all|codex|claude|opencode] [--out dir]|deploy --target dir [--scope project] [--provider all|codex|claude|opencode] [--dry-run]|uninstall --target dir --scope project --provider <provider>|plugins [--home dir] [--provider all|codex|claude|opencode] [--dry-run]|toolchain [--os macos|linux] [--pkg brew|apt|dnf|pacman|zypper|apk] [--optional ctx7,deepwiki,playwright]",
	);
	process.exit(command ? 2 : 0);
}
