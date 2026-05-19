import {
	applyPassiveInstall,
	type ExitCode,
	type InstallReport,
	OlympusError,
	planExecutableInstall,
	planPassiveInstall,
	stageExecutableInstall,
} from "lifecycle";
import { asJson } from "reporting";

export async function runInstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args.find((arg) => !arg.startsWith("--"));
	if (source === undefined) {
		throw new OlympusError(
			"usage: olympus install <source> --project [--dry-run|--apply] [--executable --signature-digest <sha256>] [--json]",
			2,
		);
	}
	if (!args.includes("--project")) {
		throw new OlympusError(
			"install requires --project; global writes are forbidden",
			3,
		);
	}
	const apply = args.includes("--apply");
	const dryRun = args.includes("--dry-run") || !apply;
	if (apply && dryRun && args.includes("--dry-run")) {
		throw new OlympusError("install cannot combine --apply and --dry-run", 2);
	}
	const signatureDigest = readFlagValue(args, "--signature-digest");
	const executable = args.includes("--executable");
	const report = executable
		? apply
			? await stageExecutableInstall({
					source,
					apply: true,
					...(signatureDigest === undefined ? {} : { signatureDigest }),
				})
			: await planExecutableInstall({
					source,
					apply: false,
					...(signatureDigest === undefined ? {} : { signatureDigest }),
				})
		: apply
			? await applyPassiveInstall({ source, apply: true })
			: await planPassiveInstall({ source, apply: false });
	process.stdout.write(json ? asJson(report) : formatInstall(report));
	return report.blocked ? 3 : 0;
}

function formatInstall(report: InstallReport): string {
	const lines = [
		`Olympus install ${report.apply ? "apply" : "dry-run"}`,
		`Package: ${report.packageId}`,
		`Source: ${report.source}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const writePath of report.wouldWrite) {
		lines.push(`would write: ${writePath}`);
	}
	for (const writtenPath of report.written) lines.push(`wrote: ${writtenPath}`);
	if (report.signatureSubjectDigest !== undefined) {
		lines.push(`Signature subject digest: ${report.signatureSubjectDigest}`);
	}
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
