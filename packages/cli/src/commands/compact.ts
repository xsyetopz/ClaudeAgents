import { type ExitCode, OlympiError } from "lifecycle";
import {
	asJson,
	type CompactionKind,
	type CompactionMode,
	compactFile,
} from "reporting";

export async function runCompact(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const filePath = readFilePath(args);
	if (filePath === undefined) {
		throw new OlympiError(
			"usage: olympi debug compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]",
			2,
		);
	}
	const report = await compactFile(filePath, {
		kind: readKind(args),
		mode: readMode(args),
	});
	process.stdout.write(json ? asJson(report) : formatCompact(report));
	return 0;
}

function readFilePath(args: string[]): string | undefined {
	let skipNext = false;
	for (const arg of args) {
		if (skipNext) {
			skipNext = false;
			continue;
		}
		if (arg === "--kind") {
			skipNext = true;
			continue;
		}
		if (arg === "--raw" || arg === "--verbose") continue;
		if (!arg.startsWith("--")) return arg;
	}
	return undefined;
}

function readKind(args: string[]): CompactionKind | "auto" {
	const index = args.indexOf("--kind");
	if (index === -1) return "auto";
	const value = args[index + 1];
	if (
		value === "generic" ||
		value === "git" ||
		value === "test" ||
		value === "search" ||
		value === "package-manager" ||
		value === "stack-trace"
	) {
		return value;
	}
	throw new OlympiError("invalid --kind for olympi debug compact", 2);
}

function readMode(args: string[]): CompactionMode {
	if (args.includes("--raw")) return "raw";
	if (args.includes("--verbose")) return "verbose";
	return "compact";
}

function formatCompact(
	report: Awaited<ReturnType<typeof compactFile>>,
): string {
	const lines = [
		`Olympi compaction: ${report.kind}`,
		`RTK: ${report.rtkStatus}`,
		`Fallback: ${report.fallbackReason ?? "none"}`,
		...report.summary,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
