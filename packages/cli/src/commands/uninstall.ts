import { uninstall } from "@openagentlayer/deploy";
import { flag, providerOption, required } from "../arguments";
import { printChanges } from "../output";
import { scopeContext } from "../scope";

export async function runUninstallCommand(args: string[]): Promise<void> {
	const context = scopeContext(args, { requireTarget: true });
	const provider = providerOption(required(args, "--provider"));
	if (provider === "all")
		throw new Error("Uninstall requires one provider, not all.");
	const changes = await uninstall(context.targetRoot, provider, {
		scope: context.scope,
		manifestRoot: context.manifestRoot,
	});
	printChanges(`OpenAgentLayer uninstall ${provider}`, changes, {
		quiet: flag(args, "--quiet"),
		verbose: flag(args, "--verbose"),
	});
}
