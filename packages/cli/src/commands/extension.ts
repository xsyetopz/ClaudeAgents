import { createExtensionSkeleton, inspectExtensionPath } from "extensions";
import { type ExitCode, OlympiError } from "lifecycle";
import {
	asJson,
	formatExtensionCreate,
	formatExtensionInspect,
} from "reporting";

export function runExtension(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	const subcommand = args[0];
	switch (subcommand) {
		case "inspect":
			return runExtensionInspect(args.slice(1), json);
		case "create":
			return runExtensionCreate(args.slice(1), json);
		default:
			throw new OlympiError(
				"usage: olympi debug extension <inspect|create> ...",
				2,
			);
	}
}

async function runExtensionInspect(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args[0];
	if (source === undefined) {
		throw new OlympiError(
			"usage: olympi debug extension inspect <path> [--json]",
			2,
		);
	}
	const report = await inspectExtensionPath(source);
	process.stdout.write(json ? asJson(report) : formatExtensionInspect(report));
	return report.warnings.length > 0 ? 1 : 0;
}

async function runExtensionCreate(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const name = args.find((arg) => !arg.startsWith("--"));
	if (name === undefined) {
		throw new OlympiError(
			"usage: olympi debug extension create <name> [--dry-run|--apply --output <directory>] [--json]",
			2,
		);
	}
	const outputDirectory = readFlagValue(args, "--output");
	const apply = args.includes("--apply");
	const dryRun = args.includes("--dry-run") || !apply;
	if (apply && dryRun && args.includes("--dry-run")) {
		throw new OlympiError(
			"extension create cannot combine --apply and --dry-run",
			2,
		);
	}
	const report = await createExtensionSkeleton({
		name,
		...(outputDirectory === undefined ? {} : { outputDirectory }),
		apply,
	});
	process.stdout.write(json ? asJson(report) : formatExtensionCreate(report));
	return 0;
}

function readFlagValue(args: string[], flagName: string): string | undefined {
	const index = args.indexOf(flagName);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new OlympiError(`${flagName} requires a value`, 2);
	}
	return value;
}
