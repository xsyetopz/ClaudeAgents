import { inspectLocalPackage } from "./inspection";
import type { EvaluationReport, RiskLabel } from "./types";

export async function evaluateLocalPackage(
	source: string,
): Promise<EvaluationReport> {
	const inspection = await inspectLocalPackage(source);
	const labels = new Set<RiskLabel>(["UNSIGNED"]);
	for (const resource of inspection.resources) {
		for (const label of resource.labels) labels.add(label);
	}
	for (const executable of inspection.executables) {
		for (const label of executable.labels) labels.add(label);
	}
	const conflicts = findConflicts(inspection.warnings);
	const hasExecutable = inspection.executables.length > 0;
	const hasWarnings = inspection.warnings.length > 0;
	return {
		schemaVersion: 1,
		inspection,
		conflicts,
		labels: [...labels].sort(),
		decision: hasExecutable || hasWarnings ? "inspect-more" : "trust-passive",
		recommendation: hasExecutable
			? "Executable resources are present. Keep this package inspect-only until explicit trust and sandbox gates exist."
			: "Only passive resources were discovered. A later phase may create a manifest-backed passive install plan.",
	};
}

function findConflicts(warnings: string[]): string[] {
	return warnings.filter((warning) => warning.includes("collision"));
}
