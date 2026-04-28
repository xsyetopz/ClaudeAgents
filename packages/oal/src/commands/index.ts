import { checkCommand } from "./check";
import { doctorCommand } from "./doctor";
import { explainCommand } from "./explain";
import { renderCommand } from "./render";
import type { CliCommand } from "./types";

export const commands: CliCommand[] = [
	checkCommand,
	renderCommand,
	explainCommand,
	doctorCommand,
];

export function commandUsage(): string {
	const names = commands.map((command) => command.name).join("|");
	const summaries = commands
		.map((command) => `  ${command.name.padEnd(8)} ${command.summary}`)
		.join("\n");
	return `usage: oal <${names}>\n\ncommands:\n${summaries}`;
}

export function findCommand(name: string): CliCommand | undefined {
	return commands.find((command) => command.name === name);
}
