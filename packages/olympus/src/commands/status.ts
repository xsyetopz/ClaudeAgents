import { asJson } from "../report";
import { buildStatusReport, formatStatusReport } from "../reports/status";
import type { ExitCode } from "../types";

export async function runStatus(json: boolean): Promise<ExitCode> {
	const status = await buildStatusReport();
	process.stdout.write(json ? asJson(status) : formatStatusReport(status));
	return status.warnings.length > 0 ? 1 : 0;
}
