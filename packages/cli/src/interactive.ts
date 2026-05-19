import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import {
	aegisPiRuntimeStatus,
	aegisPolicyStatus,
	createExtensionSkeleton,
	inspectExtensionPath,
} from "extensions";
import {
	applyManifestUninstall,
	applyPassiveInstall,
	type ExitCode,
	evaluateLocalPackage,
	inspectLocalPackage,
	OlympusError,
	planManifestUninstall,
	planPassiveInstall,
} from "lifecycle";
import {
	asJson,
	buildAcceptanceReport,
	buildHandoffReport,
	buildStatusReport,
	compactFile,
	detectRtk,
	formatAcceptanceReport,
	formatEvaluation,
	formatExtensionCreate,
	formatExtensionInspect,
	formatHandoffMarkdown,
	formatInspection,
	formatOlympusCatalog,
	formatStatusReport,
	getOlympusCatalog,
} from "reporting";
import { hookPolicyStatus, runSandboxProbe } from "safety";
import { buildSafetyCheckReport } from "./commands/safety.ts";
import { buildVerifyReport, formatVerifyReport } from "./commands/verify.ts";
import { formatSetupStatus, readSetupStatus } from "./setup-status.ts";

const LINE_SPLIT_PATTERN = /\r?\n/;

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
	olympusState: {
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
	session.write("Olympus interactive command hub\n");
	await showStatus(session, mode);
	while (true) {
		session.write(menuText(mode));
		const choice = normalizeChoice(await session.ask("Select action: "));
		try {
			if (choice === "q" || choice === "quit" || choice === "exit") {
				session.write("Stopped before any next-phase work.\n");
				return 0;
			}
			if (choice === "json" || choice === "j") {
				mode.json = !mode.json;
				session.write(`JSON output: ${mode.json ? "on" : "off"}\n`);
				continue;
			}
			if (choice === "1" || choice === "inspect") {
				await guidedInspect(session, mode);
				continue;
			}
			if (choice === "2" || choice === "evaluate" || choice === "eval") {
				await guidedEvaluate(session, mode);
				continue;
			}
			if (choice === "3" || choice === "extension") {
				await guidedExtensionCreate(session, mode);
				continue;
			}
			if (choice === "4" || choice === "status") {
				await showStatus(session, mode);
				continue;
			}
			if (choice === "5" || choice === "install") {
				await guidedInstall(session, mode);
				continue;
			}
			if (choice === "6" || choice === "uninstall") {
				await guidedUninstall(session, mode);
				continue;
			}
			if (choice === "7" || choice === "verify" || choice === "accept") {
				await guidedVerify(session, mode);
				continue;
			}
			if (choice === "8" || choice === "catalog" || choice === "spec") {
				await guidedCatalog(session, mode);
				continue;
			}
			if (choice === "9" || choice === "extension inspect") {
				await guidedExtensionInspect(session, mode);
				continue;
			}
			if (choice === "10" || choice === "report status") {
				await guidedReportStatus(session, mode);
				continue;
			}
			if (
				choice === "11" ||
				choice === "handoff" ||
				choice === "report handoff"
			) {
				await guidedHandoff(session, mode);
				continue;
			}
			if (
				choice === "12" ||
				choice === "report acceptance" ||
				choice === "acceptance"
			) {
				await guidedAcceptance(session, mode);
				continue;
			}
			if (choice === "13" || choice === "rtk") {
				await guidedRtk(session, mode);
				continue;
			}
			if (choice === "14" || choice === "compact") {
				await guidedCompact(session, mode);
				continue;
			}
			if (choice === "15" || choice === "safety") {
				await guidedSafety(session, mode);
				continue;
			}
			if (choice === "16" || choice === "setup") {
				await guidedSetupStatus(session, mode);
				continue;
			}
			session.write(
				"Unknown action. Choose a number, command name, json, or q.\n",
			);
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
		projectLocalStatePath: path.join(setup.projectRoot, ".pi", "olympus"),
		globalWriteWarning:
			"Olympus interactive never writes to ~/.pi by default; apply flows are project-local and confirmation-gated.",
		olympusState: {
			lockPresent: setup.configured.lockPresent,
			manifestPresent: setup.configured.manifestPresent,
			auditPresent: setup.configured.auditPresent,
		},
		availableFlows: [
			"inspect local package (read-only)",
			"evaluate local package (read-only)",
			"install passive package (dry-run before confirmed project-local apply)",
			"uninstall manifest-owned package (dry-run before confirmed project-local apply)",
			"status/setup/report/acceptance/RTK/safety checks (read-only)",
			"create first-party extension skeleton (explicit output only)",
		],
		blockedFlows: [
			"global ~/.pi writes are never performed by this wrapper",
			"provider renderer deploy, Codex/Claude/OpenCode adapters, and OAL compatibility mode are not restored",
			"executable third-party package loading remains blocked until future trust and sandbox gates pass",
			"setup status is read-only and does not run package-manager commands",
		],
	};
}

export function formatInteractiveStatus(status: InteractiveStatus): string {
	const lines = [
		"Olympus status",
		`Project: ${status.cwd}`,
		`Project-local state: ${status.projectLocalStatePath}`,
		`Safety: ${status.globalWriteWarning}`,
		`Project .pi: ${status.projectPiPresent ? "present" : "absent"}`,
		`Lock: ${status.olympusState.lockPresent ? "present" : "absent"}`,
		`Manifest: ${status.olympusState.manifestPresent ? "present" : "absent"}`,
		`Audit: ${status.olympusState.auditPresent ? "present" : "absent"}`,
		"Available guided flows:",
	];
	for (const flow of status.availableFlows) lines.push(`- ${flow}`);
	lines.push("Blocked/out of scope:");
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
			return Promise.resolve(input.shift() ?? "q");
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

async function guidedInspect(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	session.write(
		"Safe prompt: inspection is read-only, executes no package code, and writes no Pi state.\n",
	);
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
	session.write(
		"Safe prompt: evaluation is read-only, executes no package code, and creates no trust/install records.\n",
	);
	if (
		!(await confirm(session, "Continue with metadata-only evaluation? [y/N] "))
	) {
		session.write("Evaluation cancelled before reading a package path.\n");
		return;
	}
	const source = await promptRequired(
		session,
		"Local package path to evaluate: ",
	);
	if (source === undefined) return;
	const report = await evaluateLocalPackage(
		resolveInputPath(source, session.cwd),
	);
	writeFormatted(session, mode, report, formatEvaluation(report));
	session.write("No trust, install, sandbox, or global Pi action was taken.\n");
}

async function guidedInstall(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	session.write(
		"Safe prompt: install starts with a dry-run and can only apply project-local manifest-owned passive resources after confirmation.\n",
	);
	const source = await promptRequired(
		session,
		"Local passive package path to install: ",
	);
	if (source === undefined) return;
	const resolved = resolveInputPath(source, session.cwd);
	const dryRun = await planPassiveInstall({
		source: resolved,
		projectRoot: session.cwd,
		apply: false,
	});
	writeFormatted(session, mode, dryRun, formatInstall(dryRun));
	session.write("Dry-run complete before apply confirmation.\n");
	if (dryRun.blocked) return;
	if (
		!(await confirm(
			session,
			"Apply this project-local install exactly as planned? [y/N] ",
		))
	) {
		session.write("Install stopped after dry-run plan.\n");
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
	session.write(
		"Safe prompt: uninstall starts with a manifest-authorized dry-run and only removes matching manifest-owned files after confirmation.\n",
	);
	const packageId = await promptRequired(session, "Package id to uninstall: ");
	if (packageId === undefined) return;
	const dryRun = await planManifestUninstall({
		packageId,
		projectRoot: session.cwd,
		apply: false,
	});
	writeFormatted(session, mode, dryRun, formatUninstall(dryRun));
	session.write("Dry-run complete before apply confirmation.\n");
	if (dryRun.blocked) return;
	if (
		!(await confirm(
			session,
			"Apply this project-local uninstall exactly as planned? [y/N] ",
		))
	) {
		session.write("Uninstall stopped after dry-run plan.\n");
		return;
	}
	const apply = await applyManifestUninstall({
		packageId,
		projectRoot: session.cwd,
		apply: true,
	});
	writeFormatted(session, mode, apply, formatUninstall(apply));
}

async function guidedExtensionCreate(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	session.write(
		"Safe prompt: extension creation plans first. Apply requires an explicit output directory and never writes default project .pi state in this phase.\n",
	);
	const name = await promptRequired(session, "Extension name: ");
	if (name === undefined) return;
	const outputInput = (
		await session.ask("Output directory for apply (blank for dry-run only): ")
	).trim();
	const outputDirectory =
		outputInput.length > 0
			? resolveInputPath(outputInput, session.cwd)
			: undefined;
	const plan = await createExtensionSkeleton({
		name,
		apply: false,
		...(outputDirectory === undefined ? {} : { outputDirectory }),
	});
	writeFormatted(session, mode, plan, formatExtensionCreate(plan));
	if (
		!(await confirm(
			session,
			"Apply this skeleton to the explicit output directory? [y/N] ",
		))
	) {
		session.write("Extension creation stopped after dry-run plan.\n");
		return;
	}
	if (outputDirectory === undefined) {
		session.write(
			"Apply skipped: explicit output directory is required; default project .pi writes remain blocked.\n",
		);
		return;
	}
	const applyReport = await createExtensionSkeleton({
		name,
		outputDirectory,
		apply: true,
	});
	writeFormatted(
		session,
		mode,
		applyReport,
		formatExtensionCreate(applyReport),
	);
}

async function guidedExtensionInspect(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	session.write(
		"Safe prompt: extension inspection hashes and reports capabilities without executing extension code.\n",
	);
	const source = await promptRequired(session, "Extension path to inspect: ");
	if (source === undefined) return;
	const report = await inspectExtensionPath(
		resolveInputPath(source, session.cwd),
	);
	writeFormatted(session, mode, report, formatExtensionInspect(report));
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

async function guidedVerify(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	const report = await buildVerifyReport();
	writeFormatted(session, mode, report, formatVerifyReport(report));
}

function guidedCatalog(
	session: InteractiveSession,
	mode: InteractiveMode,
): void {
	const catalog = getOlympusCatalog();
	writeFormatted(session, mode, catalog, formatOlympusCatalog(catalog));
}

function guidedRtk(session: InteractiveSession, mode: InteractiveMode): void {
	const report = detectRtk();
	writeFormatted(session, mode, report, formatRtk(report));
}

async function guidedCompact(
	session: InteractiveSession,
	mode: InteractiveMode,
): Promise<void> {
	session.write(
		"Safe prompt: compaction reads one file, redacts secret-looking output, and records RTK/fallback status.\n",
	);
	const filePath = await promptRequired(
		session,
		"Fixture or file to compact: ",
	);
	if (filePath === undefined) return;
	const report = await compactFile(resolveInputPath(filePath, session.cwd));
	writeFormatted(session, mode, report, formatCompact(report));
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
	human: string,
): void {
	session.write(mode.json ? asJson(value) : human);
}

function resolveInputPath(inputPath: string, cwd: string): string {
	return path.isAbsolute(inputPath) ? inputPath : path.join(cwd, inputPath);
}

function normalizeChoice(value: string): string {
	return value.trim().toLowerCase();
}

function formatInteractiveError(error: unknown, json: boolean): string {
	const message =
		error instanceof OlympusError || error instanceof Error
			? error.message
			: "unknown error";
	const exitCode = error instanceof OlympusError ? error.exitCode : 5;
	if (json) {
		return `${JSON.stringify({ schemaVersion: 1, ok: false, error: { message, exitCode } })}\n`;
	}
	return `olympus interactive: ${message}\n`;
}

function menuText(mode: InteractiveMode): string {
	return `\nGuided actions (${mode.json ? "JSON" : "human"} output):
  1) Inspect a local Pi package
  2) Evaluate a local Pi package
  3) Create a first-party extension skeleton
  4) Show Olympus status
  5) Install passive package (dry-run, confirm apply)
  6) Uninstall manifest-owned package (dry-run, confirm apply)
  7) Verify / acceptance
  8) Catalog / spec
  9) Inspect extension path
  10) Report status
  11) Report handoff
  12) Report acceptance
  13) RTK status
  14) Compact output file
  15) Safety / hooks / sandbox status
  16) Setup status
  j) Toggle JSON output
  q) Quit
`;
}

function interactiveHelpText(): string {
	return "Olympus interactive command hub\n\nUsage:\n  olympus interactive\n\nGuided flows route through the same Olympus services as the CLI: inspect, evaluate, install/uninstall dry-run and confirmed project-local apply, status, setup, reports, acceptance, catalog/spec, extension create/inspect, RTK/compact, and safety checks. Global ~/.pi writes, provider renderers, OAL compatibility mode, and third-party package execution remain blocked.\n";
}

function formatInstall(
	report: Awaited<ReturnType<typeof planPassiveInstall>>,
): string {
	const lines = [
		`Olympus install ${report.apply ? "apply" : "dry-run"}`,
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
		`Olympus uninstall ${report.apply ? "apply" : "dry-run"}`,
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

function formatRtk(report: ReturnType<typeof detectRtk>): string {
	const lines = [`Olympus RTK status: ${report.status}`];
	if (report.path !== null) lines.push(`Path: ${report.path}`);
	if (report.degradedReason !== null)
		lines.push(`degraded: ${report.degradedReason}`);
	for (const recommendation of report.recommendations) {
		lines.push(
			`- ${recommendation.category}: ${recommendation.recommendation}`,
		);
	}
	return `${lines.join("\n")}\n`;
}

function formatCompact(
	report: Awaited<ReturnType<typeof compactFile>>,
): string {
	const lines = [
		`Olympus compaction: ${report.kind}`,
		`RTK: ${report.rtkStatus}`,
		`Fallback: ${report.fallbackReason ?? "none"}`,
		...report.summary,
	];
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
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
		`Olympus safety check: ${report.safety.ok ? "ok" : "failed"}`,
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
