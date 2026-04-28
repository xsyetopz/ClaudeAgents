#!/usr/bin/env bun
import { commandUsage, findCommand } from "./commands";
import { formatOalError } from "./source";

function main(argv: string[]): void {
	const [command, ...args] = argv;
	if (
		!command ||
		command === "help" ||
		command === "--help" ||
		command === "-h"
	) {
		console.log(commandUsage());
		return;
	}
	const selectedCommand = findCommand(command);
	if (!selectedCommand) {
		throw new Error(commandUsage());
	}
	if (args.includes("--help") || args.includes("-h")) {
		console.log(selectedCommand.usage);
		return;
	}
	const result = selectedCommand.run(args);
	if (result?.exitCode) {
		process.exit(result.exitCode);
	}
}

try {
	main(process.argv.slice(2));
} catch (error) {
	console.error(formatOalError(error));
	process.exit(1);
}
