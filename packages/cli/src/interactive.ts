import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { aegisPiRuntimeStatus, aegisPolicyStatus } from "extensions";
import {
	applyManifestUninstall,
	applyPassiveInstall,
	type ExitCode,
	evaluateLocalPackage,
	inspectLocalPackage,
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
	formatEvaluation,
	formatHandoffMarkdown,
	formatInspection,
	formatStatusReport,
} from "reporting";
import { hookPolicyStatus, runSandboxProbe } from "safety";
import { buildSafetyCheckReport } from "./commands/safety.ts";
import { formatSetupStatus, readSetupStatus } from "./setup-status.ts";

const LINE_SPLIT_PATTERN = /\r?\n/;
const WORD_SPLIT_PATTERN = /\s+/;

export interface InteractiveSession {
	cwd: string;
	ask(question: string): Promise<string>;
	write(message: string): void;
	close?(): void | Promise<void>;
}

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
			if (["q", "quit", "exit"].includes(request.command)) {
				session.write("Done.\n");
				return 0;
			}
			if (request.command === "json") {
				mode.json = request.args[0] !== "off";
				session.write(`JSON: ${mode.json ? "on" : "off"}\n`);
				continue;
			}
			if (request.command === "help" || request.command === "?") {
				session.write(interactiveCommandsText());
				continue;
			}
			if (request.command === "status") {
				await showStatus(session, mode);
				continue;
			}
			if (request.command === "package") {
				await guidedPackage(session, mode, request.args[0]);
				continue;
			}
			if (request.command === "install") {
				await guidedInstall(session, mode);
				continue;
			}
			if (request.command === "uninstall") {
				await guidedUninstall(session, mode);
				continue;
			}
			if (request.command === "report") {
				await guidedReport(session, mode, request.args[0]);
				continue;
			}
			if (request.command === "safety") {
				guidedSafety(session, mode);
				continue;
			}
			if (request.command === "setup") {
				await guidedSetupStatus(session, mode);
				continue;
			}
			session.write("Unknown command. Run help.\n");
		} catch (error) {
			session.write(formatInteractiveError(error, mode.json));
		}
	}
}

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
			"package",
			"install",
			"uninstall",
			"report",
			"safety",
			"setup",
			"status",
		],
		blockedFlows: [
			"global Pi writes",
			"provider renderer deploy",
			"third-party executable package load",
		],
	};
}

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
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return {
		cwd: process.cwd(),
		ask(question: string) {
			return readline.question(question);
		},
		write(message: string) {
			process.stdout.write(message);
		},
		close() {
			readline.close();
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
	return `Olympi human-present harness

Project: ${status.cwd}
State: ${status.projectLocalStatePath}
Status: ${interactiveStateLine(status)}

Commands:
  package       Inspect or evaluate Pi package resources
  install       Add project-local, policy-gated Pi resources
  uninstall     Uninstall a manifest-owned package
  report        Generate reports
  safety        Show safety gates
  setup         Show local harness readiness
  status        Show project-local harness state
  help          Show commands
  q|quit|exit   Exit interactive mode

`;
}

function interactiveCommandsText(): string {
	return `Commands:
  package       Inspect or evaluate Pi package resources
  install       Add project-local, policy-gated Pi resources
  uninstall     Uninstall a manifest-owned package
  report        Generate reports
  safety        Show safety gates
  setup         Show local harness readiness
  status        Show project-local harness state
  help          Show commands
  q|quit|exit   Exit interactive mode

Subcommands:
  package inspect|evaluate
  report status|handoff|acceptance

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

async function guidedInspect(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const source = await promptRequired(
		session,
		"Local package path to inspect: ",
	);
	if (source === undefined) return;
	const report = await inspectLocalPackage(
		resolveInputPath(source, session.cwd),
	);
	writeFormatted(session, mode, report, formatInspection(report));
}

async function guidedEvaluate(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const source = await promptRequired(
		session,
		"Local package path to evaluate: ",
	);
	if (source === undefined) return;
	const report = await evaluateLocalPackage(
		resolveInputPath(source, session.cwd),
	);
	writeFormatted(session, mode, report, formatEvaluation(report));
}

async function guidedPackage(
	session: InteractiveSession,
	mode: InteractiveMode,
	subcommand: string | undefined,
): Promise<void> {
	const action =
		subcommand ??
		normalizeChoice(await session.ask("Package command (inspect|evaluate): "));
	if (action === "inspect") {
		await guidedInspect(session, mode);
		return;
	}
	if (action === "evaluate") {
		await guidedEvaluate(session, mode);
		return;
	}
	session.write("Unknown package command. Use inspect or evaluate.\n");
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
	if (action === "status") {
		await guidedReportStatus(session, mode);
		return;
	}
	if (action === "handoff") {
		await guidedHandoff(session, mode);
		return;
	}
	if (action === "acceptance") {
		await guidedAcceptance(session, mode);
		return;
	}
	session.write(
		"Unknown report command. Use status, handoff, or acceptance.\n",
	);
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

function guidedSafety(
	session: InteractiveSession,
	mode: InteractiveMode,
): void {
	const safety = buildSafetyCheckReport();
	const hooks = aegisPolicyStatus();
	const runtime = aegisPiRuntimeStatus();
	const policy = hookPolicyStatus();
	const sandbox = runSandboxProbe();
	const report = {
		schemaVersion: 1 as const,
		command: "interactive safety",
		safety,
		hooks,
		runtime,
		policy,
		sandbox,
	};
	writeFormatted(session, mode, report, formatSafety(report));
}

async function guidedSetupStatus(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const report = await readSetupStatus(session.cwd);
	writeFormatted(session, mode, report, formatSetupStatus(report));
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
	const parts = normalizeChoice(value)
		.split(WORD_SPLIT_PATTERN)
		.filter(Boolean);
	return { command: parts[0] ?? "", args: parts.slice(1) };
}

function formatInteractiveError(error: unknown, json: boolean): string {
	const message =
		error instanceof OlympiError || error instanceof Error
			? error.message
			: "unknown error";
	const exitCode = error instanceof OlympiError ? error.exitCode : 5;
	if (json) {
		return `${JSON.stringify({ schemaVersion: 1, ok: false, error: { message, exitCode } })}\n`;
	}
	return `olympi interactive: ${message}\n`;
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

function formatSafety(report: {
	safety: ReturnType<typeof buildSafetyCheckReport>;
	hooks: ReturnType<typeof aegisPolicyStatus>;
	runtime: ReturnType<typeof aegisPiRuntimeStatus>;
	policy: ReturnType<typeof hookPolicyStatus>;
	sandbox: ReturnType<typeof runSandboxProbe>;
}): string {
	const lines = [
		`Olympi safety check: ${report.safety.ok ? "ok" : "failed"}`,
		`Aegis hooks: ${report.hooks.status}`,
		`Aegis runtime entrypoint: ${report.runtime.extensionEntrypoint}`,
		`Hook policy: ${report.policy.status}`,
		`Sandbox: ${report.sandbox.status}`,
	];
	for (const check of report.safety.checks) {
		lines.push(
			`${check.ok ? "ok" : "fail"}: ${check.name} (${check.decision})`,
		);
	}
	for (const warning of report.hooks.warnings)
		lines.push(`warning: ${warning}`);
	for (const warning of report.sandbox.warnings)
		lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}
