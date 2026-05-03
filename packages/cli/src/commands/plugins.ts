import { homedir } from "node:os";
import { resolve } from "node:path";
import { allPluginProviders, syncPlugins } from "@openagentlayer/plugins";
import { flag, option, providerOption } from "../arguments";
import { renderOptions } from "../model-options";
import { loadCheckedSource } from "../source";

export async function runPluginsCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const rawProvider = providerOption(option(args, "--provider") ?? "all");
	const providers =
		rawProvider === "all" ? allPluginProviders() : [rawProvider];
	const home = resolve(option(args, "--home") ?? homedir());
	const options = await renderOptions(args);
	const source = await loadCheckedSource(repoRoot);
	const result = await syncPlugins({
		repoRoot,
		home,
		source,
		providers,
		dryRun: flag(args, "--dry-run"),
		renderOptions: options,
	});
	console.log(JSON.stringify(result.changes, null, 2));
}
