import { type ExitCode, OlympusError } from "lifecycle";
import { asJson } from "reporting";
import { formatSetupStatus, readSetupStatus } from "../setup-status.js";

export async function runSetup(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0] ?? "status";
	if (subcommand !== "status" && subcommand !== "inspect") {
		throw new OlympusError("usage: olympus setup status [--json]", 2);
	}
	const report = await readSetupStatus();
	process.stdout.write(json ? asJson(report) : formatSetupStatus(report));
	return report.warnings.length > 0 ? 1 : 0;
}
