import path from "node:path";
import type { ExtensionCreatePlan, ExtensionInspectReport } from "extensions";
import type { EvaluationReport, InspectionReport } from "lifecycle";
import { stablePrettyJson } from "./reports/schema.js";

export function formatInspection(report: InspectionReport): string {
	const lines = [
		`Olympi inspection: ${report.package.name}@${report.package.version}`,
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
		`Olympi package evaluation: ${report.inspection.package.name}@${report.inspection.package.version}`,
		`Decision: ${report.decision}`,
		`Recommendation: ${report.recommendation}`,
		`Labels: ${report.labels.join(", ")}`,
	];
	for (const conflict of report.conflicts) lines.push(`conflict: ${conflict}`);
	for (const warning of report.inspection.warnings)
		lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

export function formatExtensionInspect(report: ExtensionInspectReport): string {
	const lines = [
		`Olympi extension inspection: ${report.path}`,
		`Entrypoints: ${report.entrypoints.length}`,
		`Manifest: ${report.manifest.present ? (report.manifest.valid ? "valid" : "invalid") : "absent"}`,
	];
	for (const entrypoint of report.entrypoints) {
		lines.push(`- ${entrypoint.path} ${entrypoint.hash}`);
	}
	for (const command of report.inferred.commands)
		lines.push(`command: ${command}`);
	for (const tool of report.inferred.tools) lines.push(`tool: ${tool}`);
	for (const provider of report.inferred.providers) {
		lines.push(`provider: ${provider}`);
	}
	for (const event of report.inferred.events) lines.push(`event: ${event}`);
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

export function formatExtensionCreate(report: ExtensionCreatePlan): string {
	const lines = [
		`Olympi extension create ${report.apply ? "apply" : "dry-run"}`,
		`Name: ${report.name}`,
		`Target: ${path.relative(process.cwd(), report.targetDirectory) || "."}`,
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite) {
		lines.push(`would write: ${writePath}`);
	}
	for (const writtenPath of report.written) {
		lines.push(`wrote: ${writtenPath}`);
	}
	return `${lines.join("\n")}\n`;
}

export function asJson(value: unknown): string {
	return stablePrettyJson(value);
}
