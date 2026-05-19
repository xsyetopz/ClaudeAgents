import {
	aegisPiRuntimeStatus,
	aegisPolicyStatus,
	installAegisProjectExtension,
} from "extensions";
import { type ExitCode, OlympusError } from "lifecycle";
import { asJson } from "reporting";

export function runHooks(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	if (args[0] === "aegis-install") {
		if (!args.includes("--project")) {
			throw new OlympusError(
				"usage: olympus hooks aegis-install --project [--dry-run|--apply] [--json]",
				2,
			);
		}
		return installAegisProjectExtension({
			apply: args.includes("--apply"),
		}).then((report) => {
			process.stdout.write(json ? asJson(report) : formatInstall(report));
			return 0;
		});
	}
	if (args[0] === "aegis-runtime") {
		const report = aegisPiRuntimeStatus();
		process.stdout.write(json ? asJson(report) : formatRuntime(report));
		return 0;
	}
	if (args[0] !== "policy") {
		throw new OlympusError(
			"usage: olympus hooks <policy|aegis-runtime|aegis-install> [--json]",
			2,
		);
	}
	const report = aegisPolicyStatus();
	process.stdout.write(json ? asJson(report) : formatHooks(report));
	return 0;
}

function formatInstall(
	report: Awaited<ReturnType<typeof installAegisProjectExtension>>,
): string {
	const lines = [
		`Olympus Aegis install: ${report.apply ? "applied" : "dry-run"}`,
		`Entrypoint: ${report.entrypoint}`,
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	for (const writePath of report.written) lines.push(`written: ${writePath}`);
	return `${lines.join("\n")}\n`;
}

function formatRuntime(
	report: ReturnType<typeof aegisPiRuntimeStatus>,
): string {
	const lines = [
		"Olympus Aegis Pi runtime integration: available",
		`Entrypoint: ${report.extensionEntrypoint}`,
		`Subscribed events: ${report.subscribedEvents.join(", ")}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

function formatHooks(report: ReturnType<typeof aegisPolicyStatus>): string {
	const lines = [
		`Olympus hooks policy: ${report.status}`,
		`Runtime execution: ${report.runtimeExecutionEnabled ? "enabled" : "disabled"}`,
		`Subscribed events: ${report.subscribedEvents.join(", ")}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
