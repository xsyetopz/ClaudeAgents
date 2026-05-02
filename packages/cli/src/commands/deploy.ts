import { resolve } from "node:path";
import { renderAllProviders, renderProvider } from "@openagentlayer/adapter";
import { applyDeploy, planDeploy } from "@openagentlayer/deploy";
import { option, providerOption, required, scopeOption } from "../arguments";
import { loadCheckedSource } from "../source";

export async function runDeployCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const target = required(args, "--target");
	const provider = providerOption(option(args, "--provider") ?? "all");
	scopeOption(option(args, "--scope") ?? "project");
	const source = await loadCheckedSource(repoRoot);
	const artifacts =
		provider === "all"
			? (await renderAllProviders(source, repoRoot)).artifacts
			: (await renderProvider(provider, source, repoRoot)).artifacts;
	const plan = await planDeploy(resolve(target), artifacts);
	if (args.includes("--dry-run"))
		console.log(JSON.stringify(plan.changes, null, 2));
	else await applyDeploy(plan);
}
