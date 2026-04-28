import { explain } from "../render";
import type { CliCommand } from "./types";
import { optionValue, positionalArgs } from "./types";

export const explainCommand: CliCommand = {
	name: "explain",
	summary: "explain generated path source provenance",
	usage: "usage: oal explain <generated-path> [--out generated]",
	run(args) {
		const [target] = positionalArgs(args);
		if (!target) {
			throw new Error(explainCommand.usage);
		}
		const outDir = optionValue(args, "--out", "generated");
		console.log(
			JSON.stringify(explain(process.cwd(), target, outDir), null, "\t"),
		);
	},
};
