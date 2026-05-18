import { buildCurrentHandoff } from "../handoff/current";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

export async function runHandoff(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "current")
		throw new OlympusError("usage: olympus handoff current [--json]", 2);
	const report = await buildCurrentHandoff();
	process.stdout.write(json ? asJson(report) : report.markdown);
	return report.warnings.length > 0 ? 1 : 0;
}
