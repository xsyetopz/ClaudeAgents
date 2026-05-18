import { detectRtk } from "../compaction";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

export function runRtk(args: string[], json: boolean): ExitCode {
	if (args[0] !== "status") {
		throw new OlympusError("usage: olympus rtk status [--json]", 2);
	}
	const report = detectRtk();
	process.stdout.write(json ? asJson(report) : formatRtk(report));
	return 0;
}

function formatRtk(report: ReturnType<typeof detectRtk>): string {
	const lines = [`Olympus RTK status: ${report.status}`];
	if (report.path !== null) lines.push(`Path: ${report.path}`);
	if (report.degradedReason !== null)
		lines.push(`degraded: ${report.degradedReason}`);
	for (const recommendation of report.recommendations) {
		lines.push(
			`- ${recommendation.category}: ${recommendation.recommendation}`,
		);
	}
	return `${lines.join("\n")}\n`;
}
