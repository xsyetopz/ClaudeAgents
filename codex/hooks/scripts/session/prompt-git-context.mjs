#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { loadProjectMemory, renderMemoryContext } from "../_memory.mjs";
import { passthrough, readStdin } from "../_lib.mjs";

function runGit(args) {
	try {
		const result = spawnSync("git", args, {
			encoding: "utf8",
			timeout: 1000,
		});
		return result.status === 0 ? result.stdout.trim() : "";
	} catch {
		return "";
	}
}

(async () => {
	const data = await readStdin();
	if (!data?.cwd) passthrough();

	const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
	const recent = runGit(["log", "--oneline", "-5", "--no-decorate"]);
	const diffStat = runGit(["diff", "--stat", "--no-color", "HEAD"]);
	const memory = await loadProjectMemory(data.cwd);
	const parts = [];

	if (branch) parts.push(`Branch: ${branch}`);
	if (recent) parts.push(`Recent commits:\n${recent}`);
	if (diffStat) parts.push(`Uncommitted changes:\n${diffStat}`);
	const memoryContext = renderMemoryContext(memory, false);
	if (memoryContext) parts.push(memoryContext);
	if (!parts.length) passthrough();

	process.stdout.write(`openagentsbtw git context:\n${parts.join("\n\n")}\n`);
	process.exit(0);
})();
