import { resolve } from "node:path";
import { uninstall } from "@openagentlayer/deploy";
import { option, providerOption, required, scopeOption } from "../arguments";

export async function runUninstallCommand(args: string[]): Promise<void> {
	const target = required(args, "--target");
	const provider = providerOption(required(args, "--provider"));
	scopeOption(option(args, "--scope") ?? "project");
	if (provider === "all")
		throw new Error("Uninstall requires one provider, not all.");
	console.log(
		JSON.stringify(await uninstall(resolve(target), provider), null, 2),
	);
}
