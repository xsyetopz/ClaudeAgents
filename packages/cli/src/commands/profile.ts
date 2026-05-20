import {
	type ExitCode,
	OlympiError,
	readProfileStatus,
	setProjectProfile,
} from "lifecycle";
import { asJson } from "reporting";

export async function runProfile(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	switch (args[0]) {
		case "status": {
			const report = await readProfileStatus();
			process.stdout.write(json ? asJson(report) : formatStatus(report));
			return 0;
		}
		case "set": {
			const name = readFlagValue(args, "--name") ?? args[1];
			if (name === undefined) {
				throw new OlympiError(
					"usage: olympi profile set --name <name> [--apply] [--json]",
					2,
				);
			}
			const description = readFlagValue(args, "--description");
			const report = await setProjectProfile({
				name,
				...(description === undefined ? {} : { description }),
				apply: args.includes("--apply"),
			});
			process.stdout.write(json ? asJson(report) : formatSet(report));
			return 0;
		}
		default:
			throw new OlympiError("usage: olympi profile <status|set> [--json]", 2);
	}
}

function formatStatus(
	report: Awaited<ReturnType<typeof readProfileStatus>>,
): string {
	return `Olympi profile: ${report.profile?.name ?? "unset"}\n`;
}

function formatSet(
	report: Awaited<ReturnType<typeof setProjectProfile>>,
): string {
	const lines = [
		`Olympi profile set: ${report.profile.name}`,
		`Apply: ${report.apply ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	for (const writePath of report.written) lines.push(`written: ${writePath}`);
	return `${lines.join("\n")}\n`;
}

function readFlagValue(args: string[], flagName: string): string | undefined {
	const index = args.indexOf(flagName);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new OlympiError(`${flagName} requires a value`, 2);
	}
	return value;
}
