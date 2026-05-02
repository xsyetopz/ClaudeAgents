import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allPluginProviders, syncPlugins } from "@openagentlayer/plugins";
import type { OalSource } from "@openagentlayer/source";

const MARKETPLACE_FILES = [
	"marketplace/claude/.claude-plugin/plugin.json",
	"marketplace/claude/.claude-plugin/marketplace.json",
	"marketplace/codex/.codex-plugin/plugin.json",
	"marketplace/opencode/package.json",
] as const;

export async function assertPluginMarketplace(
	repoRoot: string,
	source: OalSource,
): Promise<void> {
	for (const path of MARKETPLACE_FILES) {
		const content = await readFile(join(repoRoot, path), "utf8");
		const parsed = JSON.parse(content) as { name?: string; version?: string };
		if (!parsed.name?.includes("openagentlayer"))
			throw new Error(
				`Marketplace payload ${path} is not named OpenAgentLayer.`,
			);
		if (path.endsWith("plugin.json") && parsed.version !== source.version)
			throw new Error(`Marketplace payload ${path} version drifted.`);
	}
	await assertPluginSync(repoRoot, source);
}

async function assertPluginSync(
	repoRoot: string,
	source: OalSource,
): Promise<void> {
	const home = await mkdtemp(join(tmpdir(), "oal-plugin-accept-"));
	try {
		await seedStalePluginCaches(home);
		const preview = await syncPlugins({
			repoRoot,
			home,
			source,
			providers: allPluginProviders(),
			dryRun: true,
		});
		if (!preview.changes.some((change) => change.action === "write"))
			throw new Error("Plugin dry-run did not plan payload writes.");
		const applied = await syncPlugins({
			repoRoot,
			home,
			source,
			providers: allPluginProviders(),
		});
		if (!applied.changes.some((change) => change.action === "remove"))
			throw new Error("Plugin sync did not prune stale OAL caches.");
		for (const path of [
			".codex/plugins/openagentlayer/.codex-plugin/plugin.json",
			".codex/plugins/cache/openagentlayer-local/openagentlayer/0.1.0/.codex-plugin/plugin.json",
			".claude/plugins/marketplaces/openagentlayer/.claude-plugin/marketplace.json",
			".opencode/plugins/openagentlayer/package.json",
			".agents/plugins/marketplace.json",
		])
			await readFile(join(home, path), "utf8");
		const staleFile = join(
			home,
			".codex/plugins/cache/openagentlayer-local/openagentlayer/0.0.1/stale.txt",
		);
		let staleExists = true;
		try {
			await readFile(staleFile, "utf8");
		} catch {
			staleExists = false;
		}
		if (staleExists)
			throw new Error("Plugin sync left stale Codex cache behind.");
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}

async function seedStalePluginCaches(home: string): Promise<void> {
	const stalePaths = [
		".codex/plugins/cache/openagentlayer-local/openagentlayer/0.0.1",
		".claude/plugins/cache/temp_local_openagentlayer",
		".opencode/plugins/cache/openagentlayer/0.0.1",
	];
	for (const path of stalePaths)
		await mkdir(join(home, path), { recursive: true });
	await writeFile(
		join(
			home,
			".codex/plugins/cache/openagentlayer-local/openagentlayer/0.0.1/stale.txt",
		),
		"stale",
	);
}
