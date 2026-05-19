import {
	type ExitCode,
	OlympiError,
	planManifestUninstall,
	planPassiveInstall,
} from "lifecycle";
import { asJson } from "reporting";

interface PlanReport {
	schemaVersion: 1;
	operation: string;
	mutationPolicy: "read-only" | "dry-run-only";
	wouldRead: string[];
	wouldWrite: string[];
	wouldRemove: string[];
	blocked: boolean;
	reason: string;
}

export async function runPlan(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const operation = args[0];
	if (operation === undefined)
		throw new OlympiError(
			"usage: olympi plan <operation> [source] [--json]",
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
			wouldRead: [],
			wouldWrite: [],
			wouldRemove: [],
			blocked: false,
			reason: "inspection and evaluation are read-only",
		};
	}
	if (operation === "install" && source !== undefined) {
		const installPlan = await planPassiveInstall({ source, apply: false });
		return {
			schemaVersion: 1,
			operation,
			mutationPolicy: "dry-run-only",
			wouldRead: [],
			wouldWrite: installPlan.wouldWrite,
			wouldRemove: [],
			blocked: installPlan.blocked,
			reason: installPlan.reason,
		};
	}
	if (operation === "uninstall" && source !== undefined) {
		const uninstallPlan = await planManifestUninstall({
			packageId: source,
			apply: false,
		});
		return {
			schemaVersion: 1,
			operation,
			mutationPolicy: "dry-run-only",
			wouldRead: uninstallPlan.wouldRead,
			wouldWrite: [],
			wouldRemove: uninstallPlan.wouldRemove,
			blocked: uninstallPlan.blocked,
			reason: uninstallPlan.reason,
		};
	}
	return {
		schemaVersion: 1,
		operation,
		mutationPolicy: "dry-run-only",
		wouldRead: [],
		wouldWrite: [],
		wouldRemove: [],
		blocked: true,
		reason: "operation is not apply-capable in the current Olympi boundary",
	};
}

function formatPlan(report: PlanReport): string {
	const lines = [
		`Olympi plan: ${report.operation}`,
		`Mutation policy: ${report.mutationPolicy}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const readPath of report.wouldRead)
		lines.push(`would read: ${readPath}`);
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	for (const removePath of report.wouldRemove)
		lines.push(`would remove: ${removePath}`);
	return `${lines.join("\n")}\n`;
}
