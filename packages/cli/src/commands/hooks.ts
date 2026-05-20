import {
	aegisPiRuntimeStatus,
	aegisPolicyStatus,
	installAegisPiExtension,
} from "extensions";
import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";

export function runHooks(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	switch (args[0]) {
		case "aegis-install": {
			if (args.includes("--project") && args.includes("--global")) {
				throw new OlympiError(
					"aegis-install cannot combine --project and --global; omit both for default project-local or use --global explicitly",
					2,
				);
			}
			const provenance = readFlagValue(args, "--provenance");
			return installAegisPiExtension({
				scope: args.includes("--global") ? "global" : "project-local",
				apply: args.includes("--apply"),
				confirmed: args.includes("--confirm-global"),
				...(provenance === undefined ? {} : { provenance }),
			}).then((report) => {
				process.stdout.write(json ? asJson(report) : formatInstall(report));
				return report.blocked ? 3 : 0;
			});
		}
		case "aegis-runtime": {
			const report = aegisPiRuntimeStatus();
			process.stdout.write(json ? asJson(report) : formatRuntime(report));
			return 0;
		}
		case "policy": {
			const report = aegisPolicyStatus();
			process.stdout.write(json ? asJson(report) : formatHooks(report));
			return 0;
		}
		default:
			throw new OlympiError(
				"usage: olympi safety hooks <policy|aegis-runtime|aegis-install> [--json]",
				2,
			);
	}
}

function formatInstall(
	report: Awaited<ReturnType<typeof installAegisPiExtension>>,
): string {
	const lines = [
		`Olympi Aegis install: ${report.apply ? "applied" : "dry-run"}`,
		`Scope: ${report.scope}`,
		`Target state: ${report.targetStatePath}`,
		`Entrypoint: ${report.entrypoint}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Written: ${report.written.length > 0 ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const settingsPath of report.settingsTouched)
		lines.push(`settings touched: ${settingsPath}`);
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

function formatRuntime(
	report: ReturnType<typeof aegisPiRuntimeStatus>,
): string {
	const lines = [
		"Olympi Aegis Pi runtime integration: available",
		`Entrypoint: ${report.extensionEntrypoint}`,
		`Subscribed events: ${report.subscribedEvents.join(", ")}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

function formatHooks(report: ReturnType<typeof aegisPolicyStatus>): string {
	const lines = [
		`Olympi hooks policy: ${report.status}`,
		`Runtime execution: ${report.runtimeExecutionEnabled ? "enabled" : "disabled"}`,
		`Subscribed events: ${report.subscribedEvents.join(", ")}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
