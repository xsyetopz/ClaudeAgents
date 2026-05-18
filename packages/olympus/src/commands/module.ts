import { moduleStatus, runModuleDry } from "../modules/contracts";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

export function runModule(args: string[], json: boolean): ExitCode {
	if (args[0] === "status") {
		const report = moduleStatus();
		process.stdout.write(
			json
				? asJson(report)
				: `Olympus module status: ${report.modules.length} modules\n`,
		);
		return 0;
	}
	if (args[0] === "run") {
		const moduleName = args[1];
		if (moduleName === undefined)
			throw new OlympusError(
				"usage: olympus module run <module> --dry-run [--json]",
				2,
			);
		const report = runModuleDry(moduleName, args.includes("--dry-run"));
		process.stdout.write(
			json
				? asJson(report)
				: `Olympus module run ${moduleName}: ${report.decision}\n`,
		);
		return report.decision === "allowed-dry-run" ? 0 : 1;
	}
	throw new OlympusError("usage: olympus module <status|run> ...", 2);
}
