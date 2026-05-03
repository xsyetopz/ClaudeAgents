import { readFile } from "node:fs/promises";
import {
	assertKnownModelPlan,
	parseOpenCodeModels,
	type RenderOptions,
} from "@openagentlayer/adapter";
import { option } from "./arguments";

export async function renderOptions(args: string[]): Promise<RenderOptions> {
	const plan = option(args, "--plan");
	const modelsFile = option(args, "--opencode-models-file");
	const options: RenderOptions = {};
	if (plan) {
		assertKnownModelPlan(plan);
		options.plan = plan;
	}
	if (modelsFile)
		options.opencodeModels = parseOpenCodeModels(
			await readFile(modelsFile, "utf8"),
		);
	else if (plan === "opencode-auto" || plan === "opencode-auth")
		options.opencodeModels = await detectOpenCodeModels(plan);
	return options;
}

async function detectOpenCodeModels(plan: string): Promise<string[]> {
	const proc = Bun.spawn(["opencode", "models"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, _stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode === 0) return parseOpenCodeModels(stdout);
	if (plan === "opencode-auth")
		throw new Error("OpenCode auth plan requires `opencode models`.");
	return [];
}
