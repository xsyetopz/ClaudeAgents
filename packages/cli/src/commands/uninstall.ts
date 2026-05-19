import {
	applyManifestUninstall,
	type ExitCode,
	OlympiError,
	planManifestUninstall,
} from "lifecycle";
import { asJson } from "reporting";

export async function runUninstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const packageId = args.find((arg) => !arg.startsWith("--"));
	if (packageId === undefined) {
		throw new OlympiError(
			"usage: olympi uninstall <package-id> --project [--dry-run|--apply] [--json]",
			2,
		);
	}
	if (!args.includes("--project")) {
		throw new OlympiError(
			"uninstall requires --project; global writes are forbidden",
			3,
		);
	}
	const apply = args.includes("--apply");
	const dryRun = args.includes("--dry-run") || !apply;
	if (apply && dryRun && args.includes("--dry-run")) {
		throw new OlympiError("uninstall cannot combine --apply and --dry-run", 2);
	}
	const report = apply
		? await applyManifestUninstall({ packageId, apply: true })
		: await planManifestUninstall({ packageId, apply: false });
	process.stdout.write(json ? asJson(report) : formatUninstall(report));
	if (report.blocked) return 3;
	return report.preserved.length > 0 ? 1 : 0;
}

function formatUninstall(
	report: Awaited<ReturnType<typeof planManifestUninstall>>,
): string {
	const lines = [
		`Olympi uninstall ${report.apply ? "apply" : "dry-run"}`,
		`Package: ${report.packageId}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const readPath of report.wouldRead)
		lines.push(`would read: ${readPath}`);
	for (const removePath of report.wouldRemove) {
		lines.push(`would remove: ${removePath}`);
	}
	for (const removedPath of report.removed)
		lines.push(`removed: ${removedPath}`);
	for (const preservedPath of report.preserved) {
		lines.push(`preserved: ${preservedPath}`);
	}
	return `${lines.join("\n")}\n`;
}
