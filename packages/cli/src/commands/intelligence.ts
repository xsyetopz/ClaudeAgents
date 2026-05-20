import {
	buildRepoMap,
	codeIntelligenceStatus,
	type ExitCode,
	readRepoMap,
	refreshRepoMap,
} from "lifecycle";
import { asJson } from "reporting";

export async function runIntelligence(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0] ?? "status";
	switch (subcommand) {
		case "status": {
			const report = await codeIntelligenceStatus();
			process.stdout.write(json ? asJson(report) : formatStatus(report));
			return 0;
		}
		case "refresh": {
			const report = await refreshRepoMap();
			process.stdout.write(json ? asJson(report) : formatRepoMap(report));
			return 0;
		}
		case "context": {
			const report = (await readRepoMap()) ?? (await buildRepoMap());
			const context = {
				schemaVersion: 1 as const,
				command: "code-intelligence context" as const,
				statePath: report.statePath,
				contextPacket: report.contextPacket,
			};
			process.stdout.write(
				json ? asJson(context) : `${report.contextPacket}\n`,
			);
			return 0;
		}
		default:
			process.stderr.write(
				"olympi: usage: olympi dev intelligence <status|refresh|context> [--json]\n",
			);
			return 2;
	}
}

function formatStatus(
	report: Awaited<ReturnType<typeof codeIntelligenceStatus>>,
): string {
	return `${[
		`Olympi code intelligence: ${report.present ? "present" : "absent"}`,
		`state: ${report.statePath}`,
		`parser: ${report.engine.parser}`,
		`tree-sitter: ${report.engine.treeSitter}`,
		`lsp: ${report.engine.lsp}`,
		`lsp detail: ${report.engine.lspDetail}`,
	].join("\n")}\n`;
}

function formatRepoMap(
	report: Awaited<ReturnType<typeof refreshRepoMap>>,
): string {
	return `${[
		"Olympi code intelligence refreshed",
		`state: ${report.statePath}`,
		`files: ${report.files.length}`,
		`packages: ${report.packages.join(", ") || "none"}`,
		`tree-sitter: ${report.engine.treeSitter}`,
		`lsp: ${report.engine.lsp}`,
	].join("\n")}\n`;
}
