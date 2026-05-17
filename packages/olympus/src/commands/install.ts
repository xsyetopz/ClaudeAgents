import { evaluateLocalPackage } from "../evaluation";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

interface InstallDryRunReport {
	schemaVersion: 1;
	command: "install";
	source: string;
	project: boolean;
	apply: false;
	blocked: true;
	wouldWrite: string[];
	reason: string;
}

export async function runInstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args.find((arg) => !arg.startsWith("--"));
	if (source === undefined)
		throw new OlympusError(
			"usage: olympus install <source> --project --dry-run [--json]",
			2,
		);
	if (!args.includes("--project"))
		throw new OlympusError(
			"install requires --project; global writes are forbidden",
			3,
		);
	if (!args.includes("--dry-run")) {
		throw new OlympusError(
			"install apply is blocked in Phase 03; rerun with --dry-run",
			3,
		);
	}
	await evaluateLocalPackage(source);
	const report: InstallDryRunReport = {
		schemaVersion: 1,
		command: "install",
		source,
		project: true,
		apply: false,
		blocked: true,
		wouldWrite: [
			".pi/settings.json packages entry",
			".pi/olympus/olympus-manifest.json",
			".pi/olympus/packages/<package-id>/package/**",
		],
		reason:
			"Phase 03 implements the CLI boundary only; passive mirror apply waits for manifest-backed install work",
	};
	process.stdout.write(json ? asJson(report) : formatInstallDryRun(report));
	return 3;
}

function formatInstallDryRun(report: InstallDryRunReport): string {
	const lines = [
		"Olympus install dry-run",
		`Source: ${report.source}`,
		"Apply: blocked",
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	return `${lines.join("\n")}\n`;
}
