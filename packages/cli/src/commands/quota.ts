import type { ExitCode } from "lifecycle";
import { asJson } from "reporting";
import { loadQuotaStatus } from "safety";

export async function runQuota(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0];
	if (subcommand !== "status") return usage();
	const report = await loadQuotaStatus();
	process.stdout.write(json ? asJson(report) : formatQuota(report));
	return 0;
}

function usage(): ExitCode {
	process.stderr.write("olympi: usage: olympi quota status [--json]\n");
	return 2;
}

function formatQuota(
	report: Awaited<ReturnType<typeof loadQuotaStatus>>,
): string {
	const lines = [
		`Olympi quota status: ${report.profile}`,
		`Limits: ${report.limits}`,
		`Uncertainty: ${report.uncertainty}`,
		`Warning: ${report.expensiveWorkflowWarning}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
