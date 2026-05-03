import { homedir } from "node:os";
import { resolve } from "node:path";
import { allPluginProviders, syncPlugins } from "@openagentlayer/plugins";
import { flag, option, providerOptions } from "../arguments";
import { renderOptions } from "../model-options";
import { printChanges } from "../output";
import { installableProviders } from "../provider-binaries";
import { loadCheckedSource } from "../source";

export async function runPluginsCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const selectedProviders = providerOptions(
		option(args, "--provider") ?? "all",
	);
	const availability = await installableProviders(
		selectedProviders.includes("all")
			? allPluginProviders()
			: selectedProviders,
	);
	const home = resolve(option(args, "--home") ?? homedir());
	const options = await renderOptions(args);
	const source = await loadCheckedSource(repoRoot, args);
	const result = await syncPlugins({
		repoRoot,
		home,
		source,
		providers: availability.providers,
		dryRun: flag(args, "--dry-run"),
		renderOptions: options,
	});
	if (flag(args, "--json")) {
		console.log(
			JSON.stringify(
				{ changes: result.changes, skippedProviders: availability.skipped },
				null,
				2,
			),
		);
		return;
	}
	if (flag(args, "--quiet")) return;
	const mode = flag(args, "--dry-run") ? "DRY RUN" : "APPLY";
	console.log(`OpenAgentLayer plugins ${mode}`);
	console.log(`home: ${home}`);
	console.log(`providers: ${availability.providers.join(", ") || "none"}`);
	for (const skipped of availability.skipped)
		console.log(`skip provider: ${skipped.provider} (${skipped.reason})`);
	printChanges("plugin changes", result.changes, {
		verbose: flag(args, "--verbose") || flag(args, "--dry-run"),
	});
}
