import { render } from "../render";
import type { CliCommand } from "./types";
import { optionValue } from "./types";

export const renderCommand: CliCommand = {
	name: "render",
	summary: "render generated output",
	usage: "usage: oal render [--out generated]",
	run(args) {
		const outDir = optionValue(args, "--out", "generated");
		render(process.cwd(), outDir);
		console.log(`oal render ok: ${outDir}`);
	},
};
