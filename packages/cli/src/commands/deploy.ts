import { renderAllProviders, renderProvider } from "@openagentlayer/adapter";
import { applyDeploy, planDeploy } from "@openagentlayer/deploy";
import { option, providerOption } from "../arguments";
import { renderOptions } from "../model-options";
import { scopeArtifacts, scopeContext } from "../scope";
import { loadCheckedSource } from "../source";

export async function runDeployCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const context = scopeContext(args, { requireTarget: true });
	const provider = providerOption(option(args, "--provider") ?? "all");
	const options = await renderOptions(args);
	const source = await loadCheckedSource(repoRoot);
	const artifacts =
		provider === "all"
			? (await renderAllProviders(source, repoRoot, options)).artifacts
			: (await renderProvider(provider, source, repoRoot, options)).artifacts;
	const plan = await planDeploy(
		context.targetRoot,
		scopeArtifacts(context, artifacts),
		{
			scope: context.scope,
			manifestRoot: context.manifestRoot,
		},
	);
	if (args.includes("--dry-run"))
		console.log(JSON.stringify(plan.changes, null, 2));
	else await applyDeploy(plan);
}
