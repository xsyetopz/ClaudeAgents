import { checkSource } from "../check";
import type { CliCommand } from "./types";

export const checkCommand: CliCommand = {
	name: "check",
	summary: "validate OAL source",
	usage: "usage: oal check",
	run() {
		checkSource();
		console.log("oal check ok");
	},
};
