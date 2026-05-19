import { type ExitCode, OlympiError } from "lifecycle";
import {
	asJson,
	buildAcceptanceReport,
	buildHandoffReport,
	buildPackageRiskReport,
	buildStatusReport,
	formatAcceptanceReport,
	formatHandoffMarkdown,
	formatStatusReport,
	writeAcceptanceArtifact,
	writeHandoffArtifact,
	writeStatusArtifact,
} from "reporting";

export async function runReport(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const subcommand = args[0];
	if (subcommand === "status") {
		if (args.includes("--write")) {
			const artifact = await writeStatusArtifact();
			process.stdout.write(json ? asJson(artifact) : formatArtifact(artifact));
			return 0;
		}
		const report = await buildStatusReport();
		process.stdout.write(json ? asJson(report) : formatStatusReport(report));
		return report.warnings.length > 0 ? 1 : 0;
	}
	if (subcommand === "handoff") {
		if (args.includes("--write")) {
			const artifact = await writeHandoffArtifact(writeOptionsFromArgs(args));
			process.stdout.write(json ? asJson(artifact) : formatArtifact(artifact));
			return 0;
		}
		const report = await buildHandoffReport();
		process.stdout.write(json ? asJson(report) : formatHandoffMarkdown(report));
		return report.warnings.length > 0 ? 1 : 0;
	}
	if (subcommand === "acceptance") {
		if (args.includes("--write")) {
			const artifact = await writeAcceptanceArtifact();
			process.stdout.write(json ? asJson(artifact) : formatArtifact(artifact));
			return 0;
		}
		const report = await buildAcceptanceReport();
		process.stdout.write(
			json ? asJson(report) : formatAcceptanceReport(report),
		);
		return report.ok ? 0 : 1;
	}
	if (subcommand === "package-risk" || subcommand === "risk") {
		const source = args[1];
		if (source === undefined) {
			throw new OlympiError(
				"usage: olympi report package-risk <source> [--json]",
				2,
			);
		}
		const report = await buildPackageRiskReport(source);
		process.stdout.write(json ? asJson(report) : formatPackageRisk(report));
		return report.decision === "trust-passive" ? 0 : 1;
	}
	throw new OlympiError(
		"usage: olympi report <status|handoff|acceptance|package-risk> [--json]",
		2,
	);
}

function writeOptionsFromArgs(args: string[]): {
	statusline?: string;
	thresholdPercent?: number;
} {
	const statusline = readFlagValue(args, "--statusline");
	const thresholdPercent = readNumberFlag(args, "--threshold-percent");
	return {
		...(statusline === undefined ? {} : { statusline }),
		...(thresholdPercent === undefined ? {} : { thresholdPercent }),
	};
}

function formatArtifact(
	report: Awaited<ReturnType<typeof writeStatusArtifact>>,
): string {
	const lines = [
		`Olympi artifact write: ${report.artifact}`,
		`Path: ${report.path}`,
		`Reason: ${report.reason}`,
	];
	if (
		report.compactAdvice?.nextCommand !== null &&
		report.compactAdvice !== null
	) {
		lines.push(`next command: ${report.compactAdvice.nextCommand}`);
	}
	return `${lines.join("\n")}\n`;
}

function formatPackageRisk(
	report: Awaited<ReturnType<typeof buildPackageRiskReport>>,
): string {
	const lines = [
		`Olympi package risk: ${report.package.name}@${report.package.version}`,
		`Decision: ${report.decision}`,
		`Recommendation: ${report.recommendation}`,
		`Digest: ${report.package.contentDigest}`,
		`Resources: ${report.resourceCount}`,
		`Executables: ${report.executableCount}`,
		`Labels: ${report.labels.join(", ") || "none"}`,
	];
	for (const conflict of report.conflicts) lines.push(`conflict: ${conflict}`);
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

function readFlagValue(args: string[], flagName: string): string | undefined {
	const index = args.indexOf(flagName);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new OlympiError(`${flagName} requires a value`, 2);
	}
	return value;
}

function readNumberFlag(args: string[], flagName: string): number | undefined {
	const value = readFlagValue(args, flagName);
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
		throw new OlympiError(`${flagName} must be a number from 0 to 100`, 2);
	}
	return parsed;
}
