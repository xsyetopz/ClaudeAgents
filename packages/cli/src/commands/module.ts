import {
	applyHephaestusPlan,
	moduleStatus,
	proveHephaestusApplyGate,
	runModuleDry,
} from "authoring";
import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";

export function runModule(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	if (args[0] === "status") {
		const report = moduleStatus();
		process.stdout.write(
			json
				? asJson(report)
				: `Olympi module status: ${report.modules.length} modules\n`,
		);
		return 0;
	}
	if (args[0] === "run") {
		const moduleName = args[1];
		if (moduleName === undefined)
			throw new OlympiError(
				"usage: olympi debug module run <module> --dry-run [--json]",
				2,
			);
		const report = runModuleDry(moduleName, args.includes("--dry-run"));
		process.stdout.write(
			json
				? asJson(report)
				: `Olympi module run ${moduleName}: ${report.decision}\n`,
		);
		return report.decision === "allowed-dry-run" ? 0 : 1;
	}
	if (args[0] === "hephaestus" && args[1] === "proof") {
		const planFile = args[2];
		if (planFile === undefined) {
			throw new OlympiError(
				"usage: olympi debug module hephaestus proof <plan-file> [--json]",
				2,
			);
		}
		return proveHephaestusApplyGate(planFile).then((report) => {
			process.stdout.write(
				json ? asJson(report) : `Olympi Hephaestus proof: ${report.decision}\n`,
			);
			return report.decision === "proven" ? 0 : 1;
		});
	}
	if (args[0] === "hephaestus" && args[1] === "apply") {
		const planFile = args[2];
		if (planFile === undefined) {
			throw new OlympiError(
				"usage: olympi debug module hephaestus apply <plan-file> [--apply] [--json]",
				2,
			);
		}
		return applyHephaestusPlan(planFile, {
			apply: args.includes("--apply"),
		}).then((report) => {
			process.stdout.write(
				json
					? asJson(report)
					: `Olympi Hephaestus apply: ${report.blocked ? "blocked" : report.apply ? "applied" : "dry-run"}\n`,
			);
			return report.blocked ? 3 : 0;
		});
	}
	throw new OlympiError("usage: olympi debug module <status|run> ...", 2);
}
