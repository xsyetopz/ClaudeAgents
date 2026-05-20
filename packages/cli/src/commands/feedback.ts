import {
	type ExitCode,
	type FeedbackSource,
	OlympiError,
	readFeedbackReport,
	recordFeedbackItem,
} from "lifecycle";
import { asJson } from "reporting";

export async function runFeedback(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0] ?? "list";
	switch (subcommand) {
		case "list": {
			const report = await readFeedbackReport();
			process.stdout.write(json ? asJson(report) : formatFeedback(report));
			return 0;
		}
		case "record": {
			const source = readFlagValue(args, "--source") as
				| FeedbackSource
				| undefined;
			const problem = readFlagValue(args, "--problem");
			if (source === undefined || problem === undefined)
				throw new OlympiError(
					"usage: olympi dev feedback record --source <source> --problem <text> [--evidence <text>] [--affected <path>] [--json]",
					2,
				);
			const item = await recordFeedbackItem(process.cwd(), {
				source,
				observedProblem: problem,
				evidence: readRepeatedFlagValues(args, "--evidence"),
				affected: readRepeatedFlagValues(args, "--affected"),
			});
			process.stdout.write(
				json ? asJson(item) : `${item.id}: ${item.classification}\n`,
			);
			return 0;
		}
		default:
			throw new OlympiError(
				"usage: olympi dev feedback <list|record> [--json]",
				2,
			);
	}
}

function formatFeedback(
	report: Awaited<ReturnType<typeof readFeedbackReport>>,
): string {
	const lines = [`Olympi feedback items: ${report.items.length}`];
	for (const item of report.items)
		lines.push(
			`- ${item.id}: ${item.classification}; ${item.status}; owner=${item.owningPackage}`,
		);
	return `${lines.join("\n")}\n`;
}

function readFlagValue(args: string[], flag: string): string | undefined {
	const index = args.indexOf(flag);
	return index === -1 ? undefined : args[index + 1];
}

function readRepeatedFlagValues(args: string[], flag: string): string[] {
	const values: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		if (args[index] === flag && args[index + 1] !== undefined)
			values.push(args[index + 1] ?? "");
	}
	return values.filter((value) => value.trim().length > 0);
}
