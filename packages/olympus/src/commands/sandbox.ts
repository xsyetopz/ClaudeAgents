import { asJson } from "../report";
import { runSandboxProbe } from "../sandbox/probe";
import { type ExitCode, OlympusError } from "../types";

export function runSandbox(args: string[], json: boolean): ExitCode {
	if (args[0] !== "check")
		throw new OlympusError("usage: olympus sandbox check [--json]", 2);
	const report = runSandboxProbe();
	process.stdout.write(json ? asJson(report) : formatSandbox(report));
	return report.executableLoadAllowed ? 0 : 1;
}

function formatSandbox(report: ReturnType<typeof runSandboxProbe>): string {
	const lines = [`Olympus sandbox check: ${report.status}`];
	for (const probe of report.fakeHomeProbes) {
		lines.push(`${probe.denied ? "denied" : "allowed"}: ${probe.path}`);
	}
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
