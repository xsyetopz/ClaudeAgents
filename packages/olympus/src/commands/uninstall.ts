import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

interface UninstallDryRunReport {
	schemaVersion: 1;
	command: "uninstall";
	packageId: string;
	project: boolean;
	apply: false;
	blocked: true;
	wouldRead: string[];
	wouldRemove: string[];
	reason: string;
}

export function runUninstall(args: string[], json: boolean): ExitCode {
	const packageId = args.find((arg) => !arg.startsWith("--"));
	if (packageId === undefined) {
		throw new OlympusError(
			"usage: olympus uninstall <package-id> --project --dry-run [--json]",
			2,
		);
	}
	if (!args.includes("--project"))
		throw new OlympusError(
			"uninstall requires --project; global writes are forbidden",
			3,
		);
	if (!args.includes("--dry-run")) {
		throw new OlympusError(
			"uninstall apply is blocked in Phase 03; rerun with --dry-run",
			3,
		);
	}
	const report: UninstallDryRunReport = {
		schemaVersion: 1,
		command: "uninstall",
		packageId,
		project: true,
		apply: false,
		blocked: true,
		wouldRead: [".pi/olympus/olympus-manifest.json"],
		wouldRemove: [
			"manifest-owned .pi/settings.json packages entry with hash match",
			"manifest-owned .pi/olympus/packages/<package-id>/package/** files with hash match",
		],
		reason:
			"Phase 03 exposes the manifest-authority boundary; removal apply waits for manifest implementation",
	};
	process.stdout.write(json ? asJson(report) : formatUninstallDryRun(report));
	return 3;
}

function formatUninstallDryRun(report: UninstallDryRunReport): string {
	const lines = [
		"Olympus uninstall dry-run",
		`Package: ${report.packageId}`,
		"Apply: blocked",
		`Reason: ${report.reason}`,
	];
	for (const readPath of report.wouldRead)
		lines.push(`would read: ${readPath}`);
	for (const removePath of report.wouldRemove)
		lines.push(`would remove: ${removePath}`);
	return `${lines.join("\n")}\n`;
}
