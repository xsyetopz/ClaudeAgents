import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { renderAllProviders, renderProvider } from "@openagentlayer/adapter";
import { writeArtifacts } from "@openagentlayer/artifact";
import { option, providerOption } from "../arguments";
import { renderOptions } from "../model-options";
import { scopeArtifacts, scopeContext } from "../scope";
import { loadCheckedSource } from "../source";

export async function runRenderCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const out = option(args, "--out") ?? resolve(repoRoot, "generated");
	const provider = providerOption(option(args, "--provider") ?? "all");
	const options = await renderOptions(args);
	const context = scopeContext(args);
	const source = await loadCheckedSource(repoRoot);
	await mkdir(out, { recursive: true });
	const rendered =
		provider === "all"
			? (await renderAllProviders(source, repoRoot, options)).artifacts
			: (await renderProvider(provider, source, repoRoot, options)).artifacts;
	const artifacts = scopeArtifacts(context, rendered);
	if (artifacts.length === 0)
		throw new Error(`No artifacts rendered for provider ${provider}.`);
	await writeArtifacts(out, artifacts);
	console.log(`Generated OpenAgentLayer ${provider} artifacts at ${out}`);
}
