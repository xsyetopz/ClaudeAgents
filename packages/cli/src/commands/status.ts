import type { ExitCode } from "lifecycle";
import { asJson, buildStatusReport, formatStatusReport } from "reporting";

export async function runStatus(json: boolean): Promise<ExitCode> {
	const status = await buildStatusReport();
	process.stdout.write(json ? asJson(status) : formatStatusReport(status));
	return status.warnings.length > 0 ? 1 : 0;
}
