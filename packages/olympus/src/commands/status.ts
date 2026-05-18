import { formatProjectStatus, readProjectStatus } from "../project-status";
import { asJson } from "../report";
import type { ExitCode } from "../types";

export async function runStatus(json: boolean): Promise<ExitCode> {
	const status = await readProjectStatus();
	process.stdout.write(json ? asJson(status) : formatProjectStatus(status));
	return status.warnings.length > 0 ? 1 : 0;
}
