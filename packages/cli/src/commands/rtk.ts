import { type ExitCode, OlympiError } from "lifecycle";
import { asJson, detectRtk, planRtkCommand } from "reporting";

export function runRtk(args: string[], json: boolean): ExitCode {
	if (args[0] === "plan") {
		const inputCommand = args.slice(1).join(" ").trim();
		if (inputCommand.length === 0) {
			throw new OlympiError(
				"usage: olympi debug rtk plan <command...> [--json]",
				2,
			);
		}
		const report = planRtkCommand(inputCommand);
		process.stdout.write(json ? asJson(report) : formatPlan(report));
		return 0;
	}
	if (args[0] !== "status") {
		throw new OlympiError("usage: olympi debug rtk <status|plan> [--json]", 2);
	}
	const report = detectRtk();
	process.stdout.write(json ? asJson(report) : formatRtk(report));
	return 0;
}

function formatPlan(report: ReturnType<typeof planRtkCommand>): string {
	const lines = [
		`Olympi RTK plan: ${report.category}`,
		`Preferred: ${report.preferred ? "yes" : "no"}`,
		`RTK form: ${report.recommendedForm}`,
		`Fallback form: ${report.fallbackForm}`,
	];
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}

function formatRtk(report: ReturnType<typeof detectRtk>): string {
	const lines = [`Olympi RTK status: ${report.status}`];
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
