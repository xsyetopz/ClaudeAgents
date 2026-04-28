import { doctorHooks, formatDoctorResult } from "../doctor";
import type { CliCommand, CommandResult } from "./types";

export const doctorCommand: CliCommand = {
	name: "doctor",
	summary: "run platform diagnostics",
	usage: "usage: oal doctor hooks <platform>",
	run(args): CommandResult | undefined {
		const [scope, platform] = args;
		if (scope !== "hooks" || !platform) {
			throw new Error(doctorCommand.usage);
		}
		const result = doctorHooks(platform);
		console.log(formatDoctorResult(result));
		if (!result.ok) {
			return { exitCode: 1 };
		}
		return undefined;
	},
};
