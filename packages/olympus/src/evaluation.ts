import { readFile } from "node:fs/promises";
import path from "node:path";
import { inferExtensionSourceCapabilities } from "./extension-authoring";
import { inspectLocalPackage } from "./inspection";
import type {
	EvaluationReport,
	InspectionReport,
	ResourceReport,
	RiskLabel,
} from "./types";

const BUILT_IN_TOOL_NAMES = new Set(["bash", "read", "write", "edit"]);
const RESOURCE_SPRAWL_THRESHOLD = 12;
const EXECUTABLE_SPRAWL_THRESHOLD = 4;

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
	const conflicts = await findConflicts(inspection);
	const hasExecutable = inspection.executables.length > 0;
	const hasWarnings = inspection.warnings.length > 0;
	return {
		schemaVersion: 1,
		inspection,
		conflicts,
		labels: [...labels].sort(),
		decision:
			hasExecutable || hasWarnings || conflicts.length > 0
				? "inspect-more"
				: "trust-passive",
		recommendation: recommendation(hasExecutable, conflicts),
	};
}

async function findConflicts(inspection: InspectionReport): Promise<string[]> {
	const conflicts = inspection.warnings.filter((warning) =>
		warning.includes("collision"),
	);
	conflicts.push(...resourceSprawlFindings(inspection));
	conflicts.push(...(await extensionConflictFindings(inspection)));
	return [...new Set(conflicts)].sort();
}

function resourceSprawlFindings(inspection: InspectionReport): string[] {
	const findings: string[] = [];
	if (inspection.resources.length > RESOURCE_SPRAWL_THRESHOLD) {
		findings.push(
			`resource sprawl: ${inspection.resources.length} resources discovered`,
		);
	}
	if (inspection.executables.length > EXECUTABLE_SPRAWL_THRESHOLD) {
		findings.push(
			`executable sprawl: ${inspection.executables.length} executable entrypoints discovered`,
		);
	}
	if (
		inspection.resources.some((resource) => resource.passive) &&
		inspection.executables.length > 0
	) {
		findings.push(
			"mixed passive/executable package requires separate trust decisions",
		);
	}
	return findings;
}

async function extensionConflictFindings(
	inspection: InspectionReport,
): Promise<string[]> {
	const findings: string[] = [];
	const commandOwners = new Map<string, string>();
	const extensionResources = inspection.resources.filter(
		(resource) => resource.kind === "extension",
	);
	for (const resource of extensionResources) {
		const inferred = await inferResourceCapabilities(inspection, resource);
		for (const command of inferred.commands) {
			const previousOwner = commandOwners.get(command);
			if (previousOwner !== undefined)
				findings.push(
					`extension command collision: ${command} in ${previousOwner} and ${resource.path}`,
				);
			commandOwners.set(command, resource.path);
		}
		for (const tool of inferred.tools) {
			if (BUILT_IN_TOOL_NAMES.has(tool))
				findings.push(`tool override risk: ${tool} in ${resource.path}`);
		}
		for (const provider of inferred.providers)
			findings.push(
				`extension provider registration: ${provider} in ${resource.path}`,
			);
		for (const event of inferred.events)
			findings.push(
				`extension event subscription: ${event} in ${resource.path}`,
			);
	}
	return findings;
}

async function inferResourceCapabilities(
	inspection: InspectionReport,
	resource: ResourceReport,
): Promise<ReturnType<typeof inferExtensionSourceCapabilities>> {
	const sourceText = await readFile(
		path.join(inspection.package.source, resource.path),
		"utf8",
	);
	return inferExtensionSourceCapabilities(sourceText);
}

function recommendation(hasExecutable: boolean, conflicts: string[]): string {
	if (hasExecutable) {
		return "Executable resources are present. Keep this package inspect-only until explicit trust and sandbox gates exist.";
	}
	if (conflicts.length > 0) {
		return "Conflicts or sprawl were found. Review the evaluation report before any passive install plan.";
	}
	return "Only passive resources were discovered. A later phase may create a manifest-backed passive install plan.";
}
