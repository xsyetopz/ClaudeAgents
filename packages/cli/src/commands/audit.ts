import { type ExitCode, OlympusError } from "lifecycle";
import { appendAuditArtifact, asJson } from "reporting";

export async function runAudit(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args[0] !== "append") {
		throw new OlympusError(
			"usage: olympus audit append <event> --detail <detail> --apply [--json]",
			2,
		);
	}
	const event = args.slice(1).find((arg) => !arg.startsWith("--"));
	const detail = readFlagValue(args, "--detail");
	if (event === undefined || detail === undefined) {
		throw new OlympusError(
			"usage: olympus audit append <event> --detail <detail> --apply [--json]",
			2,
		);
	}
	if (!args.includes("--apply")) {
		throw new OlympusError(
			"audit append requires --apply to write project-local audit state",
			3,
		);
	}
	const report = await appendAuditArtifact({
		event,
		detail,
		ok: !args.includes("--fail"),
	});
	process.stdout.write(json ? asJson(report) : formatAudit(report));
	return 0;
}

function formatAudit(
	report: Awaited<ReturnType<typeof appendAuditArtifact>>,
): string {
	return `Olympus audit append\nPath: ${report.path}\nReason: ${report.reason}\n`;
}

function readFlagValue(args: string[], flagName: string): string | undefined {
	const index = args.indexOf(flagName);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new OlympusError(`${flagName} requires a value`, 2);
	}
	return value;
}
