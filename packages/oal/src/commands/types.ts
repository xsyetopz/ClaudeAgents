export type CommandResult = {
	exitCode?: number;
};

export type CliCommand = {
	name: string;
	summary: string;
	usage: string;
	run(args: string[]): CommandResult | undefined;
};

export function optionValue(
	args: string[],
	name: string,
	fallback: string,
): string {
	const index = args.indexOf(name);
	if (index === -1) {
		return fallback;
	}
	return args[index + 1] ?? fallback;
}

export function positionalArgs(args: string[]): string[] {
	return args.filter((arg) => !arg.startsWith("--"));
}
