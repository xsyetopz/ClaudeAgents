import { aegisPolicyStatus } from "../extensions/aegis";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

export function runHooks(args: string[], json: boolean): ExitCode {
	if (args[0] !== "policy")
		throw new OlympusError("usage: olympus hooks policy [--json]", 2);
	const report = aegisPolicyStatus();
	process.stdout.write(json ? asJson(report) : formatHooks(report));
	return 0;
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
