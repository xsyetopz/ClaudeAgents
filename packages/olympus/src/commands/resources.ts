import { asJson } from "../report";
import { validateResources } from "../resources/validate";
import { type ExitCode, OlympusError } from "../types";

export async function runResources(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "validate")
		throw new OlympusError(
			"usage: olympus resources validate [path] [--json]",
			2,
		);
	const inputPath = args.slice(1).find((arg) => !arg.startsWith("--"));
	const report = await validateResources(inputPath);
	process.stdout.write(
		json
			? asJson(report)
			: `Olympus resources validate: ${report.valid ? "ok" : "failed"}\n`,
	);
	return report.valid ? 0 : 1;
}
