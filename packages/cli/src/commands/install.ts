import { installAegisPiExtension } from "extensions";
import {
	applyPassiveInstall,
	type ExitCode,
	type InstallReport,
	OlympiError,
	planExecutableInstall,
	planPassiveInstall,
	stageExecutableInstall,
} from "lifecycle";
import { asJson } from "reporting";

export async function runInstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	assertKnownInstallFlags(args);
	const source = positionalArgs(args, [
		"--provenance",
		"--signature-digest",
	])[0];
	if (source === undefined) {
		return runExtensionInstall(args, json);
	}
	if (args.includes("--global")) {
		throw new OlympiError(
			"package/resource install does not support --global; omit the source to register the Olympi Pi extension globally",
			2,
		);
	}
	const apply = args.includes("--apply");
	const dryRun = args.includes("--dry-run") || !apply;
	if (apply && dryRun && args.includes("--dry-run")) {
		throw new OlympiError("install cannot combine --apply and --dry-run", 2);
	}
	const signatureDigest = readFlagValue(args, "--signature-digest");
	const executable = args.includes("--executable");
	const report = executable
		? apply
			? await stageExecutableInstall({
					source,
					apply: true,
					...(signatureDigest === undefined ? {} : { signatureDigest }),
				})
			: await planExecutableInstall({
					source,
					apply: false,
					...(signatureDigest === undefined ? {} : { signatureDigest }),
				})
		: apply
			? await applyPassiveInstall({ source, apply: true })
			: await planPassiveInstall({ source, apply: false });
	process.stdout.write(json ? asJson(report) : formatInstall(report));
	return report.blocked ? 3 : 0;
}

async function runExtensionInstall(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	if (args.includes("--project") && args.includes("--global")) {
		throw new OlympiError(
			"install cannot combine --project and --global; default is project-local or use --global explicitly",
			2,
		);
	}
	const apply = args.includes("--apply");
	const dryRun = args.includes("--dry-run") || !apply;
	if (apply && dryRun && args.includes("--dry-run")) {
		throw new OlympiError("install cannot combine --apply and --dry-run", 2);
	}
	const globalApply = args.includes("--global") && apply;
	const provenance =
		readFlagValue(args, "--provenance") ??
		(globalApply ? "explicit-user-approval" : undefined);
	const report = await installAegisPiExtension({
		scope: args.includes("--global") ? "global" : "project-local",
		apply,
		confirmed: args.includes("--confirm-global") || globalApply,
		...(provenance === undefined ? {} : { provenance }),
	});
	process.stdout.write(json ? asJson(report) : formatExtensionInstall(report));
	return report.blocked ? 3 : 0;
}

function formatInstall(report: InstallReport): string {
	const lines = [
		`Olympi install ${report.apply ? "apply" : "dry-run"}`,
		`Scope: ${report.scope}`,
		`Target state: ${report.targetStatePath}`,
		`Package: ${report.packageId}`,
		`Source: ${report.source}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const writePath of report.wouldWrite) {
		lines.push(`would write: ${writePath}`);
	}
	for (const settingsPath of report.settingsTouched) {
		lines.push(`settings touched: ${settingsPath}`);
	}
	for (const writtenPath of report.written) lines.push(`wrote: ${writtenPath}`);
	if (report.signatureSubjectDigest !== undefined) {
		lines.push(`Signature subject digest: ${report.signatureSubjectDigest}`);
	}
	return `${lines.join("\n")}\n`;
}

function formatExtensionInstall(
	report: Awaited<ReturnType<typeof installAegisPiExtension>>,
): string {
	const lines = [
		`Olympi install ${report.apply ? "apply" : "dry-run"}`,
		`Scope: ${report.scope}`,
		`Target state: ${report.targetStatePath}`,
		`Entrypoint: ${report.entrypoint}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Written: ${report.written.length > 0 ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	lines.push(`Slash commands: ${report.slashCommands.join(", ")}`);
	lines.push(`Skills: ${report.skills.join(", ")}`);
	lines.push(`Prompts: ${report.prompts.join(", ")}`);
	lines.push(`Hooks: ${report.hooks.join(", ")}`);
	lines.push(`Tool shims: ${report.toolShims.join(", ")}`);
	for (const settingsPath of report.settingsTouched)
		lines.push(`settings touched: ${settingsPath}`);
	for (const writePath of report.wouldWrite) {
		lines.push(`would write: ${writePath}`);
	}
	for (const writtenPath of report.written) lines.push(`wrote: ${writtenPath}`);
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

const KNOWN_INSTALL_FLAGS = new Set([
	"--apply",
	"--dry-run",
	"--executable",
	"--global",
	"--json",
	"--project",
	"--provenance",
	"--signature-digest",
]);

function assertKnownInstallFlags(args: string[]): void {
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === undefined || !arg.startsWith("-")) continue;
		if (!KNOWN_INSTALL_FLAGS.has(arg)) {
			throw new OlympiError(`Unknown install option: ${arg}`, 2, {
				input: arg,
				expected: Array.from(KNOWN_INSTALL_FLAGS).sort().join(", "),
				written: [],
			});
		}
		if (arg === "--provenance" || arg === "--signature-digest") index += 1;
	}
}

function positionalArgs(
	args: string[],
	valuedFlags: readonly string[],
): string[] {
	const positionals: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === undefined) continue;
		if (valuedFlags.includes(arg)) {
			index += 1;
			continue;
		}
		if (arg.startsWith("--")) continue;
		positionals.push(arg);
	}
	return positionals;
}
