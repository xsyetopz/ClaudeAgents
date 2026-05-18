import { asJson } from "../report";
import {
	buildAcceptanceReport,
	formatAcceptanceReport,
} from "../reports/acceptance";
import {
	buildHandoffReport,
	buildStatusReport,
	formatHandoffMarkdown,
	formatStatusReport,
} from "../reports/status";
import { type ExitCode, OlympusError } from "../types";

export async function runReport(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0];
	if (subcommand === "status") {
		const report = await buildStatusReport();
		process.stdout.write(json ? asJson(report) : formatStatusReport(report));
		return report.warnings.length > 0 ? 1 : 0;
	}
	if (subcommand === "handoff") {
		const report = await buildHandoffReport();
		process.stdout.write(json ? asJson(report) : formatHandoffMarkdown(report));
		return report.warnings.length > 0 ? 1 : 0;
	}
	if (subcommand === "acceptance") {
		const report = await buildAcceptanceReport();
		process.stdout.write(
			json ? asJson(report) : formatAcceptanceReport(report),
		);
		return report.ok ? 0 : 1;
	}
	throw new OlympusError(
		"usage: olympus report <status|handoff|acceptance> [--json]",
		2,
	);
}
