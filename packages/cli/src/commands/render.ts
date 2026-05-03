import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { renderAllProviders, renderProvider } from "@openagentlayer/adapter";
import { writeArtifacts } from "@openagentlayer/artifact";
import { option, providerOption } from "../arguments";
import { renderOptions } from "../model-options";
import { loadCheckedSource } from "../source";

export async function runRenderCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const out = option(args, "--out") ?? resolve(repoRoot, "generated");
	const provider = providerOption(option(args, "--provider") ?? "all");
	const options = await renderOptions(args);
	const source = await loadCheckedSource(repoRoot);
	await mkdir(out, { recursive: true });
	const artifacts =
		provider === "all"
			? (await renderAllProviders(source, repoRoot, options)).artifacts
			: (await renderProvider(provider, source, repoRoot, options)).artifacts;
	if (artifacts.length === 0)
		throw new Error(`No artifacts rendered for provider ${provider}.`);
	await writeArtifacts(out, artifacts);
	console.log(`Generated OpenAgentLayer ${provider} artifacts at ${out}`);
}
