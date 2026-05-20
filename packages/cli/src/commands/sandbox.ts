import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";
import { runSandboxProbe } from "safety";

export function runSandbox(args: string[], json: boolean): ExitCode {
	switch (args[0]) {
		case "check":
			break;
		default:
			throw new OlympiError("usage: olympi safety sandbox check [--json]", 2);
	}
	const report = runSandboxProbe();
	process.stdout.write(json ? asJson(report) : formatSandbox(report));
	return report.executableLoadAllowed ? 0 : 1;
}

function formatSandbox(report: ReturnType<typeof runSandboxProbe>): string {
	const lines = [`Olympi sandbox check: ${report.status}`];
	for (const probe of report.fakeHomeProbes) {
		lines.push(`${probe.denied ? "denied" : "allowed"}: ${probe.path}`);
	}
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
