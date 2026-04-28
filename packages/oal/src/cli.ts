#!/usr/bin/env bun
import { checkSource } from "./check";
import { explain, render } from "./render";
import { formatOalError } from "./source";

function optionValue(args: string[], name: string, fallback: string): string {
	const index = args.indexOf(name);
	if (index === -1) {
		return fallback;
	}
	return args[index + 1] ?? fallback;
}

function main(argv: string[]): void {
	const [command, ...args] = argv;
	if (command === "check") {
		checkSource();
		console.log("oal check ok");
		return;
	}
	if (command === "render") {
		const outDir = optionValue(args, "--out", "generated");
		render(process.cwd(), outDir);
		console.log(`oal render ok: ${outDir}`);
		return;
	}
	if (command === "explain") {
		const target = args.find((arg) => !arg.startsWith("--"));
		if (!target) {
			throw new Error("usage: oal explain <generated-path> [--out generated]");
		}
		const outDir = optionValue(args, "--out", "generated");
		console.log(
			JSON.stringify(explain(process.cwd(), target, outDir), null, "\t"),
		);
		return;
	}
	throw new Error("usage: oal <check|render|explain>");
}

try {
	main(process.argv.slice(2));
} catch (error) {
	console.error(formatOalError(error));
	process.exit(1);
}
