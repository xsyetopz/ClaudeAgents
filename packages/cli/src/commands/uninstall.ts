import { uninstallAegisPiExtension } from "extensions";
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
		return runCoreUninstall(args, json);
	}
	if (!args.includes("--project")) {
		throw new OlympiError(
			"package/resource uninstall requires --project; global Pi extension unregister is not handled by this command",
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

async function runCoreUninstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const apply = args.includes("--apply");
	const dryRun = args.includes("--dry-run") || !apply;
	if (apply && dryRun && args.includes("--dry-run")) {
		throw new OlympiError("uninstall cannot combine --apply and --dry-run", 2);
	}
	const provenance =
		readFlagValue(args, "--provenance") ??
		(args.includes("--global") && apply ? "explicit-user-approval" : undefined);
	const report = await uninstallAegisPiExtension({
		scope: args.includes("--global") ? "global" : "project-local",
		apply,
		confirmed:
			args.includes("--confirm-global") || (args.includes("--global") && apply),
		...(provenance === undefined ? {} : { provenance }),
	});
	process.stdout.write(json ? asJson(report) : formatCoreUninstall(report));
	if (report.blocked) return 3;
	return report.preserved.length > 0 ? 1 : 0;
}

function readFlagValue(args: string[], flag: string): string | undefined {
	const index = args.indexOf(flag);
	if (index === -1) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) return undefined;
	return value;
}

function formatCoreUninstall(
	report: Awaited<ReturnType<typeof uninstallAegisPiExtension>>,
): string {
	const lines = [
		`Olympi uninstall ${report.apply ? "apply" : "dry-run"}`,
		`Scope: ${report.scope}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const readPath of report.wouldRead)
		lines.push(`would read: ${readPath}`);
	for (const removePath of report.wouldRemove)
		lines.push(`would remove: ${removePath}`);
	for (const removedPath of report.removed)
		lines.push(`removed: ${removedPath}`);
	for (const preservedPath of report.preserved)
		lines.push(`preserved: ${preservedPath}`);
	return `${lines.join("\n")}\n`;
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
