import { type ExitCode, inspectLocalPackage, OlympusError } from "lifecycle";
import { asJson, formatInspection } from "reporting";

export async function runInspect(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args[0];
	if (source === undefined) {
		throwUsage("usage: olympus inspect <local-package-path> [--json]");
	}
	const report = await inspectLocalPackage(source);
	process.stdout.write(json ? asJson(report) : formatInspection(report));
	return 0;
}

function throwUsage(message: string): never {
	throw new OlympusError(message, 2);
}
