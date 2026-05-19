import { type ExitCode, OlympusError } from "lifecycle";
import {
	asJson,
	buildContextCompactionAdvice,
	parsePiStatusline,
} from "reporting";

export function runContext(args: string[], json: boolean): ExitCode {
	const subcommand = args[0];
	const statusline = readFlagValue(args, "--statusline");
	if (subcommand === "statusline") {
		if (statusline === undefined) {
			throw new OlympusError(
				"usage: olympus context statusline --statusline <pi-statusline> [--json]",
				2,
			);
		}
		const report = parsePiStatusline(statusline);
		process.stdout.write(json ? asJson(report) : formatStatusline(report));
		return report.parseWarnings.length > 0 ? 1 : 0;
	}
	if (subcommand === "compact-advice") {
		if (statusline === undefined) {
			throw new OlympusError(
				"usage: olympus context compact-advice --statusline <pi-statusline> [--after-handoff] [--threshold-percent <n>] [--json]",
				2,
			);
		}
		const report = buildContextCompactionAdvice({
			statusline,
			afterHandoff: args.includes("--after-handoff"),
			...optionalThreshold(readNumberFlag(args, "--threshold-percent")),
		});
		process.stdout.write(json ? asJson(report) : formatAdvice(report));
		return 0;
	}
	throw new OlympusError(
		"usage: olympus context <statusline|compact-advice> --statusline <pi-statusline> [--json]",
		2,
	);
}

function optionalThreshold(thresholdPercent: number | undefined): {
	thresholdPercent?: number;
} {
	return thresholdPercent === undefined ? {} : { thresholdPercent };
}

function formatStatusline(
	report: ReturnType<typeof parsePiStatusline>,
): string {
	const lines = [
		"Olympus Pi context statusline",
		`Context: ${report.contextPercent ?? "unknown"}%/${report.contextWindowTokens ?? "unknown"} tokens`,
		`Used estimate: ${report.contextUsedTokensEstimate ?? "unknown"}`,
		`Input: ${report.inputTokens ?? "unknown"}`,
		`Output: ${report.outputTokens ?? "unknown"}`,
		`Run tokens: ${report.runTokens ?? "unknown"}`,
		`Cost USD: ${report.costUsd ?? "unknown"}`,
		`Mode: ${report.mode ?? "unknown"}`,
	];
	for (const warning of report.parseWarnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

function formatAdvice(
	report: ReturnType<typeof buildContextCompactionAdvice>,
): string {
	const lines = [
		"Olympus context compact advice",
		`After handoff: ${report.afterHandoff ? "yes" : "no"}`,
		`Context: ${report.statusline.contextPercent ?? "unknown"}%/${report.statusline.contextWindowTokens ?? "unknown"} tokens`,
		`Threshold: ${report.thresholdPercent}%`,
		`Run Pi /compact: ${report.shouldRunPiCompact ? "yes" : "no"}`,
	];
	if (report.nextCommand !== null)
		lines.push(`next command: ${report.nextCommand}`);
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}

function readFlagValue(args: string[], flagName: string): string | undefined {
	const index = args.indexOf(flagName);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new OlympusError(`${flagName} requires a value`, 2);
	}
	return value;
}

function readNumberFlag(args: string[], flagName: string): number | undefined {
	const value = readFlagValue(args, flagName);
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
		throw new OlympusError(`${flagName} must be a number from 0 to 100`, 2);
	}
	return parsed;
}
