import path from "node:path";
import process from "node:process";
import {
	confirm as confirmPrompt,
	input as inputPrompt,
} from "@inquirer/prompts";
import {
	applyManifestUninstall,
	applyPassiveInstall,
	type ExitCode,
	OlympiError,
	planManifestUninstall,
	planPassiveInstall,
} from "lifecycle";
import {
	asJson,
	buildAcceptanceReport,
	buildHandoffReport,
	buildStatusReport,
	formatAcceptanceReport,
	formatHandoffMarkdown,
	formatStatusReport,
} from "reporting";
import { buildDoctorReport, formatDoctorReport } from "./commands/doctor.ts";
import { readSetupStatus } from "./setup-status.ts";

const LINE_SPLIT_PATTERN = /\r?\n/;
const WORD_SPLIT_PATTERN = /\s+/;
const PROMPT_TRAILING_COLON_PATTERN = /:\s*$/;
const PROMPT_CONFIRM_SUFFIX_PATTERN = /\s*\[[yY]\/N]\s*$/;

/** Host-agnostic session adapter used by the admin session. */
export interface InteractiveSession {
	cwd: string;
	ask(question: string): Promise<string>;
	confirm?(question: string, defaultValue: boolean): Promise<boolean>;
	write(message: string): void;
	close?(): void | Promise<void>;
}

/** Project summary shown before interactive commands ask for input. */
export interface InteractiveStatus {
	schemaVersion: 1;
	cwd: string;
	projectPiPresent: boolean;
	projectLocalStatePath: string;
	globalWriteWarning: string;
	olympiState: {
		lockPresent: boolean;
		manifestPresent: boolean;
		auditPresent: boolean;
	};
	availableFlows: string[];
	blockedFlows: string[];
}

interface InteractiveMode {
	json: boolean;
}

/** Start the process-backed admin/bootstrap prompt. */
export async function runInteractiveCli(
	args: string[] = [],
): Promise<ExitCode> {
	if (args.includes("--help") || args.includes("help")) {
		process.stdout.write(interactiveHelpText());
		return 0;
	}
	const session = await createProcessSession();
	try {
		return await runInteractiveSession(session);
	} finally {
		await session.close?.();
	}
}

/** Run an admin/bootstrap prompt against a supplied session adapter. */
export async function runInteractiveSession(
	session: InteractiveSession,
): Promise<ExitCode> {
	const mode: InteractiveMode = { json: false };
	const status = await readInteractiveStatus(session.cwd);
	session.write(interactiveStartupText(status));
	while (true) {
		const input = await session.ask("> ");
		const request = parseInteractiveInput(input);
		if (request.command.length === 0) continue;
		try {
			switch (request.command) {
				case "q":
				case "quit":
				case "exit":
					session.write("Done.\n");
					return 0;
				case "json":
					mode.json = request.args[0] !== "off";
					session.write(`JSON: ${mode.json ? "on" : "off"}\n`);
					break;
				case "help":
				case "?":
					session.write(interactiveCommandsText());
					break;
				case "status":
					await showStatus(session, mode);
					break;
				case "install":
					await guidedInstall(session, mode);
					break;
				case "uninstall":
					await guidedUninstall(session, mode);
					break;
				case "report":
					await guidedReport(session, mode, request.args[0]);
					break;
				case "doctor":
					await guidedDoctor(session, mode);
					break;
				default:
					session.write(
						`Unknown command: ${request.command}; expected status, doctor, install, uninstall, report, help, json, or quit. Run help.\nwritten: none\n`,
					);
			}
		} catch (error) {
			session.write(formatInteractiveError(error, mode.json));
		}
	}
}

/** Read project-local status for startup without mutating project or home state. */
export async function readInteractiveStatus(
	cwd: string = process.cwd(),
): Promise<InteractiveStatus> {
	const setup = await readSetupStatus(cwd);
	return {
		schemaVersion: 1,
		cwd: setup.projectRoot,
		projectPiPresent: setup.configured.projectPiPresent,
		projectLocalStatePath: ".pi/olympi",
		globalWriteWarning:
			"project-local apply only; global Pi writes are not part of interactive mode",
		olympiState: {
			lockPresent: setup.configured.lockPresent,
			manifestPresent: setup.configured.manifestPresent,
			auditPresent: setup.configured.auditPresent,
		},
		availableFlows: [
			"install",
			"uninstall",
			"doctor",
			"status",
			"report",
			"help",
		],
		blockedFlows: [
			"global Pi writes",
			"provider renderer deploy",
			"third-party executable package load",
		],
	};
}

/** Format the interactive status report for terminal output. */
export function formatInteractiveStatus(status: InteractiveStatus): string {
	const lines = [
		"Olympi status",
		`Project: ${status.cwd}`,
		`State: ${status.projectLocalStatePath}`,
		`Status: ${interactiveStateLine(status)}`,
		`Project .pi: ${status.projectPiPresent ? "present" : "absent"}`,
		`Audit: ${status.olympiState.auditPresent ? "present" : "absent"}`,
		`Write scope: ${status.globalWriteWarning}`,
		"Commands:",
	];
	for (const command of status.availableFlows) lines.push(`- ${command}`);
	lines.push("Blocked:");
	for (const flow of status.blockedFlows) lines.push(`- ${flow}`);
	return `${lines.join("\n")}\n`;
}

function createProcessSession():
	| InteractiveSession
	| Promise<InteractiveSession> {
	if (!process.stdin.isTTY) return createPipedProcessSession();
	return {
		cwd: process.cwd(),
		ask(question: string) {
			return inputPrompt({
				message: question.replace(PROMPT_TRAILING_COLON_PATTERN, ""),
			});
		},
		confirm(question: string, defaultValue: boolean) {
			return confirmPrompt({
				message: question.replace(PROMPT_CONFIRM_SUFFIX_PATTERN, ""),
				default: defaultValue,
			});
		},
		write(message: string) {
			process.stdout.write(message);
		},
	};
}

async function createPipedProcessSession(): Promise<InteractiveSession> {
	const input = await readStdinLines();
	return {
		cwd: process.cwd(),
		ask(question: string) {
			process.stdout.write(question);
			return Promise.resolve(input.shift() ?? "quit");
		},
		write(message: string) {
			process.stdout.write(message);
		},
	};
}

async function readStdinLines(): Promise<string[]> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const text = Buffer.concat(chunks).toString("utf8");
	return text.split(LINE_SPLIT_PATTERN);
}

async function showStatus(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const status = await readInteractiveStatus(session.cwd);
	writeFormatted(session, mode, status, formatInteractiveStatus(status));
}

function interactiveStartupText(status: InteractiveStatus): string {
	return `Olympi

Project: ${status.cwd}
Status: ${interactiveStateLine(status)}

Commands:
  install       Run install dry-run, then optional apply confirmation
  uninstall     Run uninstall dry-run, then optional apply confirmation
  status        Show current project state
  doctor        Check install, runtime, RTK, Pi, hooks, and state
  report        Show status, handoff, or acceptance
  help          Show commands
  q|quit|exit   Exit interactive mode

`;
}

function interactiveCommandsText(): string {
	return `Commands:
  install       Run install dry-run, then optional apply confirmation
  uninstall     Run uninstall dry-run, then optional apply confirmation
  status        Show current project state
  doctor        Check install, runtime, RTK, Pi, hooks, and state
  report        Show status, handoff, or acceptance
  help          Show commands
  q|quit|exit   Exit interactive mode

Pi workflow surface:
  Use Pi slash commands after install: /olympi-goal, /olympi-plan,
  /olympi-execute, /olympi-complete, /olympi-resume, /olympi-handoff,
  /olympi-context, and /olympi-feedback.

Controls:
  q, quit, exit
  json on|off
`;
}

function interactiveStateLine(status: InteractiveStatus): string {
	const lock = status.olympiState.lockPresent ? "lock present" : "unlocked";
	const manifest = status.olympiState.manifestPresent
		? "manifest present"
		: "no manifest";
	return `${lock}, ${manifest}`;
}

async function guidedInstall(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const source = await promptRequired(
		session,
		"Local Pi package path to install: ",
	);
	if (source === undefined) return;
	const resolved = resolveInputPath(source, session.cwd);
	const dryRun = await planPassiveInstall({
		source: resolved,
		projectRoot: session.cwd,
		apply: false,
	});
	writeFormatted(session, mode, dryRun, formatInstall(dryRun));
	if (dryRun.blocked) return;
	if (
		!(await confirm(
			session,
			`Apply install for ${dryRun.packageId} to ${session.cwd}/.pi? [y/N] `,
		))
	) {
		session.write("Install cancelled.\n");
		return;
	}
	const apply = await applyPassiveInstall({
		source: resolved,
		projectRoot: session.cwd,
		apply: true,
	});
	writeFormatted(session, mode, apply, formatInstall(apply));
}

async function guidedUninstall(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const packageId = await promptRequired(session, "Package id to uninstall: ");
	if (packageId === undefined) return;
	const dryRun = await planManifestUninstall({
		packageId,
		projectRoot: session.cwd,
		apply: false,
	});
	writeFormatted(session, mode, dryRun, formatUninstall(dryRun));
	if (dryRun.blocked) return;
	if (
		!(await confirm(
			session,
			`Remove manifest-owned files for ${dryRun.packageId} from ${session.cwd}/.pi? [y/N] `,
		))
	) {
		session.write("Uninstall cancelled.\n");
		return;
	}
	const apply = await applyManifestUninstall({
		packageId,
		projectRoot: session.cwd,
		apply: true,
	});
	writeFormatted(session, mode, apply, formatUninstall(apply));
}

async function guidedReport(
	session: InteractiveSession,
	mode: InteractiveMode,
	subcommand: string | undefined,
): Promise<void> {
	const action =
		subcommand ??
		normalizeChoice(
			await session.ask("Report command (status|handoff|acceptance): "),
		);
	switch (action) {
		case "status":
			await guidedReportStatus(session, mode);
			return;
		case "handoff":
			await guidedHandoff(session, mode);
			return;
		case "acceptance":
			await guidedAcceptance(session, mode);
			return;
		default:
			session.write(
				"Unknown report command. Use status, handoff, or acceptance.\n",
			);
	}
}

async function guidedReportStatus(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const report = await buildStatusReport(session.cwd);
	writeFormatted(session, mode, report, formatStatusReport(report));
}

async function guidedHandoff(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const report = await buildHandoffReport(session.cwd);
	writeFormatted(session, mode, report, formatHandoffMarkdown(report));
}

async function guidedAcceptance(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const report = await buildAcceptanceReport();
	writeFormatted(session, mode, report, formatAcceptanceReport(report));
}

async function guidedDoctor(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const report = await buildDoctorReport(session.cwd);
	writeFormatted(session, mode, report, formatDoctorReport(report));
}

async function promptRequired(
	session: InteractiveSession,
	question: string,
): Promise<string | undefined> {
	const value = (await session.ask(question)).trim();
	if (value.length > 0) return value;
	session.write("Cancelled: no value provided.\n");
	return undefined;
}

async function confirm(
	session: InteractiveSession,
	question: string,
): Promise<boolean> {
	if (session.confirm !== undefined) return session.confirm(question, false);
	const answer = normalizeChoice(await session.ask(question));
	return answer === "y" || answer === "yes";
}

function writeFormatted(
	session: InteractiveSession,
	mode: InteractiveMode,
	value: unknown,
	text: string,
): void {
	session.write(mode.json ? asJson(value) : text);
}

function resolveInputPath(inputPath: string, cwd: string): string {
	return path.isAbsolute(inputPath) ? inputPath : path.join(cwd, inputPath);
}

function normalizeChoice(value: string): string {
	return value.trim().toLowerCase();
}

function parseInteractiveInput(value: string): {
	command: string;
	args: string[];
} {
	const parts = value.trim().split(WORD_SPLIT_PATTERN).filter(Boolean);
	return { command: normalizeChoice(parts[0] ?? ""), args: parts.slice(1) };
}

function formatInteractiveError(error: unknown, json: boolean): string {
	const message =
		error instanceof OlympiError || error instanceof Error
			? error.message
			: "unknown error";
	const exitCode = error instanceof OlympiError ? error.exitCode : 5;
	if (json) {
		return `${JSON.stringify({ schemaVersion: 1, ok: false, error: { code: errorCode(exitCode), message, exitCode }, written: [] })}\n`;
	}
	return `olympi interactive: ${message}\nwritten: none\n`;
}

function errorCode(exitCode: number): string {
	switch (exitCode) {
		case 1:
			return "VALIDATION_OR_RISK_FINDINGS";
		case 2:
			return "MALFORMED_USAGE_OR_INPUT";
		case 3:
			return "SAFETY_BLOCK";
		case 4:
			return "UNAVAILABLE_PLATFORM_OR_BACKEND";
		default:
			return "INTERNAL_ERROR";
	}
}

function interactiveHelpText(): string {
	return `Olympi interactive

Usage:
  olympi interactive

${interactiveCommandsText()}`;
}

function formatInstall(
	report: Awaited<ReturnType<typeof planPassiveInstall>>,
): string {
	const lines = [
		`Olympi install ${report.apply ? "apply" : "dry-run"}`,
		`Package: ${report.packageId}`,
		`Source: ${report.source}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	for (const writtenPath of report.written) lines.push(`wrote: ${writtenPath}`);
	return `${lines.join("\n")}\n`;
}

function formatUninstall(
	report: Awaited<ReturnType<typeof planManifestUninstall>>,
): string {
	const lines = [
		`Olympi uninstall ${report.apply ? "apply" : "dry-run"}`,
		`Package: ${report.packageId}`,
		`Blocked: ${report.blocked ? "yes" : "no"}`,
		`Reason: ${report.reason}`,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	for (const readPath of report.wouldRead)
		lines.push(`would read: ${readPath}`);
	for (const removePath of report.wouldRemove) {
		lines.push(`would remove: ${removePath}`);
	}
	for (const removedPath of report.removed)
		lines.push(`removed: ${removedPath}`);
	for (const preservedPath of report.preserved) {
		lines.push(`preserved: ${preservedPath}`);
	}
	return `${lines.join("\n")}\n`;
}
