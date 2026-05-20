import {
	initializeMemoryStore,
	type MemoryInitReport,
	type MemorySetEnabledReport,
	type MemoryStatusReport,
	OlympiError,
	readMemoryStatus,
	setMemoryEnabled,
} from "lifecycle";
import { asJson } from "reporting";

export async function runMemory(args: string[], json: boolean): Promise<0 | 2> {
	const subcommand = args[0];
	switch (subcommand) {
		case "status": {
			const report = await readMemoryStatus();
			process.stdout.write(json ? asJson(report) : formatStatus(report));
			return 0;
		}
		case "init": {
			const report = await initializeMemoryStore({
				apply: args.includes("--apply"),
				enabled: !args.includes("--disabled"),
			});
			process.stdout.write(json ? asJson(report) : formatInit(report));
			return 0;
		}
		case "enable": {
			const report = await setMemoryEnabled({
				apply: args.includes("--apply"),
				enabled: true,
			});
			process.stdout.write(json ? asJson(report) : formatSetEnabled(report));
			return 0;
		}
		case "disable": {
			const report = await setMemoryEnabled({
				apply: args.includes("--apply"),
				enabled: false,
			});
			process.stdout.write(json ? asJson(report) : formatSetEnabled(report));
			return 0;
		}
		default:
			throw new OlympiError(
				"usage: olympi memory <status|init|enable|disable> [--apply] [--disabled] [--json]",
				2,
				{
					input: subcommand ?? "<missing>",
					expected: "status, init, enable, disable",
					written: [],
				},
			);
	}
}

function formatStatus(report: MemoryStatusReport): string {
	return [
		`Olympi memory: ${report.initialized ? "initialized" : "uninitialized"}`,
		`enabled: ${report.enabled}`,
		`path: ${report.path}`,
		`entries: ${report.entries.length}`,
		...report.entries.map((entry) => `- ${entry.id}: ${entry.text}`),
		"",
	].join("\n");
}

function formatInit(report: MemoryInitReport): string {
	return [
		`Olympi memory init: ${report.apply ? "applied" : "dry-run"}`,
		`enabled: ${report.enabled}`,
		`path: ${report.path}`,
		`entries: ${report.entries.length}`,
		...(report.wouldWrite.length > 0
			? [`would write: ${report.wouldWrite.join(", ")}`]
			: []),
		...(report.written.length > 0
			? [`written: ${report.written.join(", ")}`]
			: []),
		"",
	].join("\n");
}

function formatSetEnabled(report: MemorySetEnabledReport): string {
	return [
		`Olympi memory ${report.enabled ? "enable" : "disable"}: ${report.apply ? "applied" : "dry-run"}`,
		`enabled: ${report.enabled}`,
		...(report.wouldWrite.length > 0
			? [`would write: ${report.wouldWrite.join(", ")}`]
			: []),
		...(report.written.length > 0
			? [`written: ${report.written.join(", ")}`]
			: []),
		"",
	].join("\n");
}
