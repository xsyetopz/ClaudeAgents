import { mkdir } from "node:fs/promises";
import os from "node:os";
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

export interface RtkInitializationReport {
	schemaVersion: 1;
	command: "rtk init";
	requested: boolean;
	apply: boolean;
	global: boolean;
	blocked: boolean;
	exitCode: number | null;
	args: string[];
	stdout: string;
	stderr: string;
	written: string[];
	reason: string;
}

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

export function runRepair(args: string[], json: boolean): Promise<ExitCode> {
	assertKnownRepairFlags(args);
	const apply = !args.includes("--dry-run");
	return runExtensionInstall([apply ? "--apply" : "--dry-run"], json);
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
	const globalRequested = args.includes("--global");
	const globalApply = globalRequested && apply;
	const provenance =
		readFlagValue(args, "--provenance") ??
		(globalApply ? "explicit-user-approval" : undefined);
	const report = await installAegisPiExtension({
		scope: args.includes("--global") ? "global" : "project-local",
		apply,
		confirmed: args.includes("--confirm-global") || globalApply,
		...(provenance === undefined ? {} : { provenance }),
	});
	const rtkInitialization = await initializeRtkForInstall({
		apply,
		extensionInstallRequested: true,
		installBlocked: report.blocked,
	});
	const combinedReport = { ...report, rtkInitialization };
	process.stdout.write(
		json ? asJson(combinedReport) : formatExtensionInstall(combinedReport),
	);
	return report.blocked || rtkInitialization.blocked ? 3 : 0;
}

async function initializeRtkForInstall(options: {
	apply: boolean;
	extensionInstallRequested: boolean;
	installBlocked: boolean;
}): Promise<RtkInitializationReport> {
	const args = [
		"init",
		"--global",
		"--hook-only",
		"--auto-patch",
		...(options.apply ? [] : ["--dry-run"]),
	];
	if (!options.extensionInstallRequested || options.installBlocked) {
		return {
			schemaVersion: 1,
			command: "rtk init",
			requested: false,
			apply: false,
			global: true,
			blocked: false,
			exitCode: null,
			args,
			stdout: "",
			stderr: "",
			written: [],
			reason: options.extensionInstallRequested
				? "RTK hook initialization skipped because install is blocked"
				: "RTK global hook initialization requires an Olympi extension install",
		};
	}
	if (options.apply) await mkdir(pathForClaudeHome(), { recursive: true });
	let proc: {
		stdout: ReadableStream<Uint8Array>;
		stderr: ReadableStream<Uint8Array>;
		exited: Promise<number>;
	};
	try {
		proc = Bun.spawn(["rtk", ...args], {
			stdout: "pipe",
			stderr: "pipe",
			env: process.env,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			schemaVersion: 1,
			command: "rtk init",
			requested: true,
			apply: options.apply,
			global: true,
			blocked: true,
			exitCode: null,
			args: ["rtk", ...args],
			stdout: "",
			stderr: message,
			written: [],
			reason:
				"RTK executable is unavailable; Olympi setup is blocked until RTK is present on PATH",
		};
	}
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	const blocked = exitCode !== 0;
	return {
		schemaVersion: 1,
		command: "rtk init",
		requested: true,
		apply: options.apply,
		global: true,
		blocked,
		exitCode,
		args: ["rtk", ...args],
		stdout,
		stderr,
		written: options.apply && !blocked ? ["~/.claude/settings.json"] : [],
		reason: blocked
			? "RTK global hook initialization failed; Olympi setup is blocked before provider hook initialization completed; inspect stderr"
			: options.apply
				? "RTK global hook initialized through rtk init --global --hook-only --auto-patch"
				: "RTK global hook initialization dry-run completed",
	};
}

function pathForClaudeHome(): string {
	return `${process.env["HOME"] ?? os.homedir()}/.claude`;
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
	report: Awaited<ReturnType<typeof installAegisPiExtension>> & {
		rtkInitialization?: RtkInitializationReport;
	},
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
	if (report.rtkInitialization !== undefined) {
		lines.push(`RTK init: ${report.rtkInitialization.reason}`);
		for (const writtenPath of report.rtkInitialization.written) {
			lines.push(`rtk wrote: ${writtenPath}`);
		}
	}
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
	"--confirm-global",
	"--dry-run",
	"--executable",
	"--global",
	"--json",
	"--project",
	"--provenance",
	"--signature-digest",
]);

const KNOWN_REPAIR_FLAGS = new Set(["--apply", "--dry-run", "--json"]);

function assertKnownInstallFlags(args: string[]): void {
	let index = 0;
	while (index < args.length) {
		const arg = args[index];
		index += 1;
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

function assertKnownRepairFlags(args: string[]): void {
	for (const arg of args) {
		if (arg === undefined || !arg.startsWith("-")) continue;
		if (!KNOWN_REPAIR_FLAGS.has(arg)) {
			throw new OlympiError(`Unknown repair option: ${arg}`, 2, {
				input: arg,
				expected: Array.from(KNOWN_REPAIR_FLAGS).sort().join(", "),
				written: [],
			});
		}
	}
}

function positionalArgs(
	args: string[],
	valuedFlags: readonly string[],
): string[] {
	const positionals: string[] = [];
	let skipNext = false;
	for (const arg of args) {
		if (skipNext) {
			skipNext = false;
			continue;
		}
		if (arg === undefined) continue;
		if (valuedFlags.includes(arg)) {
			skipNext = true;
			continue;
		}
		if (arg.startsWith("--")) continue;
		positionals.push(arg);
	}
	return positionals;
}
