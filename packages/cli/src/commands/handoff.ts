import { buildCurrentHandoff } from "authoring";
import { type ExitCode, OlympiError } from "lifecycle";
import { asJson, writeCurrentHandoffArtifact } from "reporting";

export async function runHandoff(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	switch (args[0]) {
		case "current":
			break;
		default:
			throw new OlympiError(
				"usage: olympi debug handoff current [--write] [--statusline <pi-statusline>] [--json]",
				2,
			);
	}
	if (args.includes("--write")) {
		const artifact = await writeCurrentHandoffArtifact(
			writeOptionsFromArgs(args),
		);
		process.stdout.write(json ? asJson(artifact) : formatArtifact(artifact));
		return 0;
	}
	const report = await buildCurrentHandoff();
	process.stdout.write(json ? asJson(report) : report.markdown);
	return report.warnings.length > 0 ? 1 : 0;
}

function writeOptionsFromArgs(args: string[]): {
	statusline?: string;
	thresholdPercent?: number;
} {
	const statusline = readFlagValue(args, "--statusline");
	const thresholdPercent = readNumberFlag(args, "--threshold-percent");
	return {
		...(statusline === undefined ? {} : { statusline }),
		...(thresholdPercent === undefined ? {} : { thresholdPercent }),
	};
}

function formatArtifact(
	report: Awaited<ReturnType<typeof writeCurrentHandoffArtifact>>,
): string {
	const lines = [
		`Olympi handoff artifact: ${report.path}`,
		`Reason: ${report.reason}`,
	];
	if (
		report.compactAdvice?.nextCommand !== null &&
		report.compactAdvice !== null
	) {
		lines.push(`next command: ${report.compactAdvice.nextCommand}`);
	}
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

function readNumberFlag(args: string[], flagName: string): number | undefined {
	const value = readFlagValue(args, flagName);
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
		throw new OlympiError(`${flagName} must be a number from 0 to 100`, 2);
	}
	return parsed;
}
