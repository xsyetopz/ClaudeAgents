import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Artifact } from "@openagentlayer/artifact";
import type { HookRecord, Provider } from "@openagentlayer/source";

const RUNTIME_HOOK_DIR = "packages/runtime/hooks";
const MJS_EXTENSION_PATTERN = /\.mjs$/;
const SUPPORT_PREFIX_PATTERN = /^_/;

export async function renderHookArtifacts(
	provider: Provider,
	hooks: HookRecord[],
	prefix: string,
	repoRoot: string,
): Promise<Artifact[]> {
	const providerHooks = hooks.filter((hook) =>
		hook.providers.includes(provider),
	);
	const supportScripts = (await readdir(join(repoRoot, RUNTIME_HOOK_DIR)))
		.filter((script) => script.startsWith("_") && script.endsWith(".mjs"))
		.sort();
	const runtimeSupport = await Promise.all(
		supportScripts.map((script) =>
			renderHookArtifact(
				provider,
				{
					id: script
						.replace(MJS_EXTENSION_PATTERN, "")
						.replace(SUPPORT_PREFIX_PATTERN, ""),
					script,
					providers: [provider],
					events: {},
				},
				`${prefix}/${script}`,
				repoRoot,
			),
		),
	);
	const hookArtifacts = await Promise.all(
		providerHooks.map((hook) =>
			renderHookArtifact(provider, hook, `${prefix}/${hook.script}`, repoRoot),
		),
	);
	return [...runtimeSupport, ...hookArtifacts];
}

async function renderHookArtifact(
	provider: Provider,
	hook: HookRecord,
	path: string,
	repoRoot: string,
): Promise<Artifact> {
	const content = await readFile(
		join(repoRoot, RUNTIME_HOOK_DIR, hook.script),
		"utf8",
	);
	return {
		provider,
		path,
		content,
		sourceId: `hook:${hook.id}`,
		executable: true,
		mode: "file",
	};
}
