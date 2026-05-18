import { validateBrokerFixture } from "../broker/read-only";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

export async function runBroker(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "validate")
		throw new OlympusError(
			"usage: olympus broker validate <fixture> [--json]",
			2,
		);
	const fixture = args[1];
	if (fixture === undefined)
		throw new OlympusError(
			"usage: olympus broker validate <fixture> [--json]",
			2,
		);
	const report = await validateBrokerFixture(fixture);
	process.stdout.write(json ? asJson(report) : formatBroker(report));
	return report.valid ? 0 : 1;
}

function formatBroker(
	report: Awaited<ReturnType<typeof validateBrokerFixture>>,
): string {
	const lines = [`Olympus broker validate: ${report.valid ? "ok" : "failed"}`];
	lines.push(`kind: ${report.kind}`);
	lines.push(`operation: ${report.operation ?? "unknown"}`);
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}
