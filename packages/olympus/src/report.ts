import type { EvaluationReport, InspectionReport } from "./types";

export function formatInspection(report: InspectionReport): string {
	const lines = [
		`Olympus inspection: ${report.package.name}@${report.package.version}`,
		`Source: ${report.package.source}`,
		`Digest: ${report.package.contentDigest}`,
		`Pi manifest: ${report.piManifest.present ? "present" : "absent"}`,
		`Resources: ${report.resources.length}`,
		`Executables: ${report.executables.length}`,
		`Scripts: ${report.scripts.length}`,
	];
	for (const resource of report.resources) {
		lines.push(
			`- ${resource.id} ${resource.path} [${resource.labels.join(", ")}] ${resource.hash}`,
		);
		for (const supportFile of resource.supportFiles) {
			lines.push(`  support: ${supportFile.path} ${supportFile.hash}`);
		}
	}
	for (const executable of report.executables) {
		const target = executable.path ?? executable.command ?? "unknown";
		lines.push(
			`! ${executable.id} ${target} [${executable.labels.join(", ")}]`,
		);
	}
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

export function formatEvaluation(report: EvaluationReport): string {
	const lines = [
		`Olympus package evaluation: ${report.inspection.package.name}@${report.inspection.package.version}`,
		`Decision: ${report.decision}`,
		`Recommendation: ${report.recommendation}`,
		`Labels: ${report.labels.join(", ")}`,
	];
	for (const conflict of report.conflicts) lines.push(`conflict: ${conflict}`);
	for (const warning of report.inspection.warnings)
		lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

export function asJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}
