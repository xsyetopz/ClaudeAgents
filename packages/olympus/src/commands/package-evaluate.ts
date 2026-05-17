import { evaluateLocalPackage } from "../evaluation";
import { asJson, formatEvaluation } from "../report";
import { type ExitCode, OlympusError } from "../types";

export async function runPackageEvaluate(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args[0];
	if (source === undefined) {
		throw new OlympusError(
			"usage: olympus package evaluate <source> [--json]",
			2,
		);
	}
	const report = await evaluateLocalPackage(source);
	process.stdout.write(json ? asJson(report) : formatEvaluation(report));
	return report.decision === "trust-passive" ? 0 : 1;
}
