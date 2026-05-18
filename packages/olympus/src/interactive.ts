import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { evaluateLocalPackage } from "./evaluation";
import { createExtensionSkeleton } from "./extension-authoring";
import { inspectLocalPackage } from "./inspection";
import {
	formatEvaluation,
	formatExtensionCreate,
	formatInspection,
} from "./report";
import { type ExitCode, OlympusError } from "./types";

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
	olympusState: {
		lockPresent: boolean;
		manifestPresent: boolean;
		auditPresent: boolean;
	};
	availableFlows: string[];
	blockedFlows: string[];
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
	session.write("Olympus guided wrapper\n");
	await showStatus(session);
	while (true) {
		session.write(menuText());
		const choice = normalizeChoice(await session.ask("Select action: "));
		try {
			if (choice === "q" || choice === "quit" || choice === "exit") {
				session.write("Stopped before any next-phase work.\n");
				return 0;
			}
			if (choice === "1" || choice === "inspect") {
				await guidedInspect(session);
				continue;
			}
			if (choice === "2" || choice === "evaluate") {
				await guidedEvaluate(session);
				continue;
			}
			if (choice === "3" || choice === "extension") {
				await guidedExtensionCreate(session);
				continue;
			}
			if (choice === "4" || choice === "status") {
				await showStatus(session);
				continue;
			}
			session.write("Unknown action. Choose 1, 2, 3, 4, or q.\n");
		} catch (error) {
			session.write(formatInteractiveError(error));
		}
	}
}

export async function readInteractiveStatus(
	cwd: string = process.cwd(),
): Promise<InteractiveStatus> {
	return {
		schemaVersion: 1,
		cwd,
		projectPiPresent: await exists(path.join(cwd, ".pi")),
		olympusState: {
			lockPresent: await exists(path.join(cwd, ".pi/olympus/olympus.lock")),
			manifestPresent: await exists(
				path.join(cwd, ".pi/olympus/olympus-manifest.json"),
			),
			auditPresent: await exists(path.join(cwd, ".pi/olympus/audit.jsonl")),
		},
		availableFlows: [
			"inspect local package (read-only)",
			"evaluate local package (read-only)",
			"create first-party extension skeleton (explicit output only)",
		],
		blockedFlows: [
			"install/uninstall apply waits for manifest-backed Phase 06 work",
			"trust/lock writes are not performed by this wrapper",
			"sandbox probes and executable third-party code execution are out of scope",
			"global ~/.pi writes are never performed by this wrapper",
		],
	};
}

export function formatInteractiveStatus(status: InteractiveStatus): string {
	const lines = [
		"Olympus status",
		`Project: ${status.cwd}`,
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

async function showStatus(session: InteractiveSession): Promise<void> {
	session.write(
		formatInteractiveStatus(await readInteractiveStatus(session.cwd)),
	);
}

async function guidedInspect(session: InteractiveSession): Promise<void> {
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
	session.write(formatInspection(report));
}

async function guidedEvaluate(session: InteractiveSession): Promise<void> {
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
	session.write(formatEvaluation(report));
	session.write("No trust, install, sandbox, or global Pi action was taken.\n");
}

async function guidedExtensionCreate(
	session: InteractiveSession,
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
	session.write(formatExtensionCreate(plan));
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
	session.write(formatExtensionCreate(applyReport));
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

function resolveInputPath(inputPath: string, cwd: string): string {
	return path.isAbsolute(inputPath) ? inputPath : path.join(cwd, inputPath);
}

function normalizeChoice(value: string): string {
	return value.trim().toLowerCase();
}

function formatInteractiveError(error: unknown): string {
	if (error instanceof OlympusError)
		return `olympus interactive: ${error.message}\n`;
	const message = error instanceof Error ? error.message : "unknown error";
	return `olympus interactive: ${message}\n`;
}

async function exists(filePath: string): Promise<boolean> {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}

function menuText(): string {
	return "\nGuided actions:\n  1) Inspect a local Pi package\n  2) Evaluate a local Pi package\n  3) Create a first-party extension skeleton\n  4) Show Olympus status\n  q) Quit\n";
}

function interactiveHelpText(): string {
	return "Olympus interactive wrapper\n\nUsage:\n  olympus interactive\n\nGuided flows call the same Olympus inspection, evaluation, and extension-authoring services used by the low-level CLI. Install/uninstall apply, trust/lock writes, sandbox probes, broker execution, and global Pi writes are out of scope for this wrapper phase.\n";
}
