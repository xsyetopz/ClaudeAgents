import { evaluateLocalPackage } from "../evaluation";
import type { EvaluationReport } from "../types";
import { deterministicDigest, sortStrings } from "./schema";

export interface PackageRiskReport {
	schemaVersion: 1;
	command: "report package-risk";
	package: {
		name: string;
		version: string;
		sourceType: "local";
		contentDigest: string;
	};
	resourceCount: number;
	executableCount: number;
	labels: string[];
	conflicts: string[];
	warnings: string[];
	decision: EvaluationReport["decision"];
	recommendation: string;
	deterministicDigest: string;
}

export async function buildPackageRiskReport(
	source: string,
): Promise<PackageRiskReport> {
	const evaluation = await evaluateLocalPackage(source);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "report package-risk" as const,
		package: {
			name: evaluation.inspection.package.name,
			version: evaluation.inspection.package.version,
			sourceType: evaluation.inspection.package.sourceType,
			contentDigest: evaluation.inspection.package.contentDigest,
		},
		resourceCount: evaluation.inspection.resources.length,
		executableCount: evaluation.inspection.executables.length,
		labels: sortStrings(evaluation.labels),
		conflicts: sortStrings(evaluation.conflicts),
		warnings: sortStrings(evaluation.inspection.warnings),
		decision: evaluation.decision,
		recommendation: evaluation.recommendation,
	};
	return {
		...withoutDigest,
		deterministicDigest: deterministicDigest(withoutDigest),
	};
}
