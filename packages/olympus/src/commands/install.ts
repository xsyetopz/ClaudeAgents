import { applyPassiveInstall, planPassiveInstall } from "../install-flow";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

export async function runInstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args.find((arg) => !arg.startsWith("--"));
	if (source === undefined) {
		throw new OlympusError(
			"usage: olympus install <source> --project [--dry-run|--apply] [--json]",
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
	const report = apply
		? await applyPassiveInstall({ source, apply: true })
		: await planPassiveInstall({ source, apply: false });
	process.stdout.write(json ? asJson(report) : formatInstall(report));
	return report.blocked ? 3 : 0;
}

function formatInstall(
	report: Awaited<ReturnType<typeof planPassiveInstall>>,
): string {
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
	return `${lines.join("\n")}\n`;
}
