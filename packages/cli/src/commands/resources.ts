import { installFirstPartyResources, validateResources } from "authoring";
import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";

export async function runResources(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	switch (args[0]) {
		case "install": {
			if (!args.includes("--project")) {
				throw new OlympiError(
					"usage: olympi debug resources install --project [--dry-run|--apply] [--json]",
					2,
				);
			}
			const report = await installFirstPartyResources({
				apply: args.includes("--apply"),
			});
			process.stdout.write(json ? asJson(report) : formatInstall(report));
			return 0;
		}
		case "validate": {
			const inputPath = args.slice(1).find((arg) => !arg.startsWith("--"));
			const report = await validateResources(inputPath);
			process.stdout.write(
				json
					? asJson(report)
					: `Olympi resources validate: ${report.valid ? "ok" : "failed"}\n`,
			);
			return report.valid ? 0 : 1;
		}
		default:
			throw new OlympiError(
				"usage: olympi debug resources <validate|install> [path] [--json]",
				2,
			);
	}
}

function formatInstall(
	report: Awaited<ReturnType<typeof installFirstPartyResources>>,
): string {
	const lines = [
		`Olympi resources install: ${report.apply ? "applied" : "dry-run"}`,
		`Package: ${report.packageId}`,
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	for (const writePath of report.written) lines.push(`written: ${writePath}`);
	return `${lines.join("\n")}\n`;
}
