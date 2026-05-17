import { evaluateLocalPackage } from "../evaluation";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

interface PlanReport {
	schemaVersion: 1;
	operation: string;
	mutationPolicy: "read-only" | "dry-run-only";
	wouldWrite: string[];
	blocked: boolean;
	reason: string;
}

export async function runPlan(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const operation = args[0];
	if (operation === undefined)
		throw new OlympusError(
			"usage: olympus plan <operation> [source] [--json]",
			2,
		);
	const source = args[1];
	const report = await createPlan(operation, source);
	process.stdout.write(json ? asJson(report) : formatPlan(report));
	return report.blocked ? 3 : 0;
}

async function createPlan(
	operation: string,
	source: string | undefined,
): Promise<PlanReport> {
	if (
		operation === "inspect" ||
		operation === "package-evaluate" ||
		operation === "evaluate"
	) {
		return {
			schemaVersion: 1,
			operation,
			mutationPolicy: "read-only",
			wouldWrite: [],
			blocked: false,
			reason: "inspection and evaluation are read-only",
		};
	}
	if (operation === "install" && source !== undefined) {
		await evaluateLocalPackage(source);
		return {
			schemaVersion: 1,
			operation,
			mutationPolicy: "dry-run-only",
			wouldWrite: [
				".pi/settings.json packages entry",
				".pi/olympus/olympus-manifest.json",
				".pi/olympus/packages/<package-id>/package/**",
			],
			blocked: true,
			reason:
				"Phase 03 exposes the boundary only; manifest-backed apply is a later phase",
		};
	}
	return {
		schemaVersion: 1,
		operation,
		mutationPolicy: "dry-run-only",
		wouldWrite: [],
		blocked: true,
		reason: "operation is not apply-capable in Phase 03",
	};
}

function formatPlan(report: PlanReport): string {
	const lines = [
		`Olympus plan: ${report.operation}`,
		`Mutation policy: ${report.mutationPolicy}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	return `${lines.join("\n")}\n`;
}
