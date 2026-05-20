import { type ExitCode, loadExecutablePackage, OlympiError } from "lifecycle";
import { asJson } from "reporting";
import { buildExecutableTrustProof, readTrustStatus } from "trust";

export async function runTrust(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	switch (args[0]) {
		case "executable-load": {
			const packageId = readFlagValue(args, "--package-id") ?? args[1];
			if (packageId === undefined) {
				throw new OlympiError(
					"usage: olympi safety trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]",
					2,
				);
			}
			const signatureDigest = readFlagValue(args, "--signature-digest");
			const report = await loadExecutablePackage({
				packageId,
				apply: args.includes("--apply"),
				...(signatureDigest === undefined ? {} : { signatureDigest }),
			});
			process.stdout.write(json ? asJson(report) : formatLoad(report));
			return report.blocked ? 3 : 0;
		}
		case "executable-proof": {
			const packageId = readFlagValue(args, "--package-id") ?? args[1];
			if (packageId === undefined) {
				throw new OlympiError(
					"usage: olympi safety trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]",
					2,
				);
			}
			const signatureDigest = readFlagValue(args, "--signature-digest");
			const report = await buildExecutableTrustProof(packageId, {
				...(signatureDigest === undefined ? {} : { signatureDigest }),
			});
			process.stdout.write(json ? asJson(report) : formatProof(report));
			return report.executableLoadAllowed ? 0 : 1;
		}
		case "status": {
			const report = await readTrustStatus();
			process.stdout.write(json ? asJson(report) : formatTrust(report));
			return 0;
		}
		default:
			throw new OlympiError(
				"usage: olympi safety trust <status|executable-proof|executable-load> [--json]",
				2,
			);
	}
}

function formatLoad(
	report: Awaited<ReturnType<typeof loadExecutablePackage>>,
): string {
	const lines = [
		`Olympi executable load: ${report.blocked ? "blocked" : report.apply ? "applied" : "dry-run"}`,
		`Package: ${report.packageId}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	for (const writePath of report.written) lines.push(`wrote: ${writePath}`);
	return `${lines.join("\n")}\n`;
}

function formatProof(
	report: Awaited<ReturnType<typeof buildExecutableTrustProof>>,
): string {
	const lines = [
		`Olympi executable trust proof: ${report.executableLoadAllowed ? "allowed" : "blocked"}`,
		`Package: ${report.packageId}`,
		`Signature subject: ${report.signatureSubjectDigest ?? "unknown"}`,
	];
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}

function formatTrust(
	report: Awaited<ReturnType<typeof readTrustStatus>>,
): string {
	const lines = [`Olympi trust status: sandbox ${report.sandbox}`];
	for (const packageStatus of report.packages) {
		lines.push(
			`- ${packageStatus.packageId}: ${packageStatus.signs.join(", ")}`,
		);
	}
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
