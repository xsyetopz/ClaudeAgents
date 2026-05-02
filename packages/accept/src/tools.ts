import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function assertOpenCodeTools(targetRoot: string): Promise<void> {
	for (const tool of ["manifest_inspect", "generated_diff"]) {
		const toolPath = join(targetRoot, `.opencode/tools/${tool}.ts`);
		const text = await readFile(toolPath, "utf8");
		if (!text.includes("export async function"))
			throw new Error(`OpenCode tool is not runnable: ${tool}`);
		const moduleUrl = new URL(toolPath, "file://").href;
		const module = (await import(
			`${moduleUrl}?accept=${Date.now()}`
		)) as Record<string, unknown>;
		const functionName = tool.replace(/_([a-z])/g, (_match, letter: string) =>
			letter.toUpperCase(),
		);
		const integration = module[functionName];
		if (typeof integration !== "function")
			throw new Error(`OpenCode tool ${tool} does not export ${functionName}.`);
		const output = await integration();
		if (!output || typeof output !== "object")
			throw new Error(
				`OpenCode tool ${tool} did not return an object contract.`,
			);
	}
}

export async function assertSkillSupportFiles(
	targetRoot: string,
): Promise<void> {
	for (const providerPath of [
		".codex/openagentlayer/skills/rtk_safety/scripts/check-rtk.mjs",
		".codex/openagentlayer/skills/prompting/references/prompting.md",
		".claude/skills/rtk_safety/scripts/check-rtk.mjs",
		".claude/skills/prompting/references/prompting.md",
		".opencode/skills/rtk_safety/scripts/check-rtk.mjs",
		".opencode/skills/prompting/references/prompting.md",
		".claude/skills/documentation/references/doc-standard.md",
	]) {
		const content = await readFile(join(targetRoot, providerPath), "utf8");
		if (content.trim().length === 0)
			throw new Error(`Empty skill support file ${providerPath}`);
	}
}
