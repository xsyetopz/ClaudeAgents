import { asJson } from "../report";
import { readTrustStatus } from "../trust/status";
import { type ExitCode, OlympusError } from "../types";

export async function runTrust(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "status")
		throw new OlympusError("usage: olympus trust status [--json]", 2);
	const report = await readTrustStatus();
	process.stdout.write(json ? asJson(report) : formatTrust(report));
	return 0;
}

function formatTrust(
	report: Awaited<ReturnType<typeof readTrustStatus>>,
): string {
	const lines = [`Olympus trust status: sandbox ${report.sandbox}`];
	for (const packageStatus of report.packages) {
		lines.push(
			`- ${packageStatus.packageId}: ${packageStatus.signs.join(", ")}`,
		);
	}
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
