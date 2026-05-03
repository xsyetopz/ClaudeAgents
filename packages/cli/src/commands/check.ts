import { flag } from "../arguments";
import { renderableSourceReport } from "../source";

export async function runCheckCommand(
	repoRoot: string,
	args: string[] = [],
): Promise<void> {
	const verbose = flag(args, "--verbose");
	console.log("◇ Load OAL source");
	console.log("◇ Validate provider renderability");
	const report = await renderableSourceReport(repoRoot, args);
	if (verbose) {
		console.log(`source: ${report.sourceRoot}`);
		console.log(`providers: ${report.providers.join(", ")}`);
		console.log(`artifacts: ${report.artifacts}`);
		console.log(`unsupported capabilities: ${report.unsupported}`);
	}
	console.log("└ ✓ OAL source and render checks passed");
}
