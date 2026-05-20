import { buildPromptContract } from "authoring";
import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";

export async function runPrompt(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	switch (args[0]) {
		case "contract":
			break;
		default:
			throw new OlympiError(
				"usage: olympi debug prompt contract <input-or-file> [--json]",
				2,
			);
	}
	const input = args.slice(1).find((arg) => !arg.startsWith("--"));
	if (input === undefined)
		throw new OlympiError(
			"usage: olympi debug prompt contract <input-or-file> [--json]",
			2,
		);
	const report = await buildPromptContract(input);
	process.stdout.write(
		json ? asJson(report) : `Olympi prompt contract: ${report.digest}\n`,
	);
	return 0;
}
