import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";
import { buildPromptContract } from "../workflow/prompt-contract";

export async function runPrompt(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "contract")
		throw new OlympusError(
			"usage: olympus prompt contract <input-or-file> [--json]",
			2,
		);
	const input = args.slice(1).find((arg) => !arg.startsWith("--"));
	if (input === undefined)
		throw new OlympusError(
			"usage: olympus prompt contract <input-or-file> [--json]",
			2,
		);
	const report = await buildPromptContract(input);
	process.stdout.write(
		json ? asJson(report) : `Olympus prompt contract: ${report.digest}\n`,
	);
	return 0;
}
