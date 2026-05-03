import { uninstall } from "@openagentlayer/deploy";
import { providerOption, required } from "../arguments";
import { scopeContext } from "../scope";

export async function runUninstallCommand(args: string[]): Promise<void> {
	const context = scopeContext(args, { requireTarget: true });
	const provider = providerOption(required(args, "--provider"));
	if (provider === "all")
		throw new Error("Uninstall requires one provider, not all.");
	console.log(
		JSON.stringify(
			await uninstall(context.targetRoot, provider, {
				scope: context.scope,
				manifestRoot: context.manifestRoot,
			}),
			null,
			2,
		),
	);
}
