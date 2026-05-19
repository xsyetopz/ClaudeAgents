import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";
import { validateBrokerFixture } from "safety";

export async function runBroker(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "validate")
		throw new OlympiError(
			"usage: olympi safety broker validate <fixture> [--json]",
			2,
		);
	const fixture = args[1];
	if (fixture === undefined)
		throw new OlympiError(
			"usage: olympi safety broker validate <fixture> [--json]",
			2,
		);
	const report = await validateBrokerFixture(fixture);
	process.stdout.write(json ? asJson(report) : formatBroker(report));
	return report.valid ? 0 : 1;
}

function formatBroker(
	report: Awaited<ReturnType<typeof validateBrokerFixture>>,
): string {
	const lines = [`Olympi broker validate: ${report.valid ? "ok" : "failed"}`];
	lines.push(`kind: ${report.kind}`);
	lines.push(`operation: ${report.operation ?? "unknown"}`);
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}
