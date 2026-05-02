import {
	type OperatingSystem,
	type OptionalTool,
	type PackageManager,
	planToolchainInstall,
	renderToolchainPlan,
} from "@openagentlayer/toolchain";
import { option } from "../arguments";

export function runToolchainCommand(args: string[]): void {
	const os = osOption(option(args, "--os"));
	const packageManager = option(args, "--pkg") as PackageManager | undefined;
	const includeOptional = optionalTools(option(args, "--optional"));
	const baseOptions = {
		os,
		hasHomebrew: !args.includes("--homebrew-missing"),
		includeOptional,
	};
	const plan = planToolchainInstall(
		packageManager ? { ...baseOptions, packageManager } : baseOptions,
	);
	if (args.includes("--json")) console.log(JSON.stringify(plan, null, 2));
	else console.log(renderToolchainPlan(plan));
}

function osOption(rawOs: string | undefined): OperatingSystem {
	if (rawOs === "macos" || rawOs === "linux") return rawOs;
	if (!rawOs) return process.platform === "darwin" ? "macos" : "linux";
	throw new Error(`Unsupported OS ${rawOs}. Expected macos or linux.`);
}

function optionalTools(rawTools: string | undefined): OptionalTool[] {
	if (!rawTools) return [];
	return rawTools
		.split(",")
		.map((tool) => tool.trim())
		.filter((tool): tool is OptionalTool =>
			["ctx7", "deepwiki", "playwright"].includes(tool),
		);
}
