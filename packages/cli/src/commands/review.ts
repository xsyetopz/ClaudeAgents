import { reviewDiffFile, reviewPlanFile } from "authoring";
import { type ExitCode, OlympusError } from "lifecycle";
import { asJson } from "reporting";

export async function runReview(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0];
	const file = args[1];
	if ((subcommand !== "plan" && subcommand !== "diff") || file === undefined)
		throw new OlympusError(
			"usage: olympus review <plan|diff> <file> [--json]",
			2,
		);
	const report =
		subcommand === "plan"
			? await reviewPlanFile(file)
			: await reviewDiffFile(file);
	process.stdout.write(
		json
			? asJson(report)
			: `Olympus review ${subcommand}: ${report.decision}\n`,
	);
	return report.decision === "approve" ? 0 : 1;
}
