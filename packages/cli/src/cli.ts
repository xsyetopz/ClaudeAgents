#!/usr/bin/env bun
import { type ExitCode, OlympiError } from "lifecycle";
import { runAudit } from "./commands/audit.js";
import { runBroker } from "./commands/broker.js";
import { runCatalog } from "./commands/catalog.js";
import { runCompact } from "./commands/compact.js";
import { runContext } from "./commands/context.js";
import { runExtension } from "./commands/extension.js";
import { runHandoff } from "./commands/handoff.js";
import { runHooks } from "./commands/hooks.js";
import { runInspect } from "./commands/inspect.js";
import { runInstall } from "./commands/install.js";
import { runLock } from "./commands/lock.js";
import { runModule } from "./commands/module.js";
import { runPackageEvaluate } from "./commands/package-evaluate.js";
import { runProfile } from "./commands/profile.js";
import { runPrompt } from "./commands/prompt.js";
import { runQuota } from "./commands/quota.js";
import { runReport } from "./commands/report.js";
import { runResources } from "./commands/resources.js";
import { runReview } from "./commands/review.js";
import { runRtk } from "./commands/rtk.js";
import { runSafety } from "./commands/safety.js";
import { runSandbox } from "./commands/sandbox.js";
import { runSetup } from "./commands/setup.js";
import { runStatus } from "./commands/status.js";
import { runTrust } from "./commands/trust.js";
import { runUninstall } from "./commands/uninstall.js";
import { runVerify } from "./commands/verify.js";
import { runInteractiveCli } from "./interactive.ts";

interface ParsedArgs {
	command: string | undefined;
	args: string[];
	json: boolean;
	help: boolean;
}

export async function main(
	argv: string[] = process.argv.slice(2),
): Promise<ExitCode> {
	const parsed = parseArgs(argv);
	try {
		const exitCode = await dispatch(parsed);
		return exitCode;
	} catch (error) {
		return handleError(error, parsed.json);
	}
}

function parseArgs(argv: string[]): ParsedArgs {
	const json = argv.includes("--json");
	const help = argv.includes("--help") || argv.includes("-h");
	const withoutGlobalFlags = argv.filter(
		(arg) => arg !== "--json" && arg !== "--help" && arg !== "-h",
	);
	return {
		command: withoutGlobalFlags[0],
		args: withoutGlobalFlags.slice(1),
		json,
		help,
	};
}

function dispatch(parsed: ParsedArgs): ExitCode | Promise<ExitCode> {
	if (parsed.command === "help" && parsed.args[0] === "all") {
		process.stdout.write(fullHelpText());
		return 0;
	}
	if (parsed.help || parsed.command === "help" || parsed.command === "--help") {
		process.stdout.write(helpText());
		return 0;
	}
	if (parsed.command === undefined) return runInteractiveCli(parsed.args);
	switch (parsed.command) {
		case "package":
			return runPackage(parsed.args, parsed.json);
		case "install":
			return runInstall(parsed.args, parsed.json);
		case "uninstall":
			return runUninstall(parsed.args, parsed.json);
		case "setup":
			return runSetup(parsed.args, parsed.json);
		case "status":
			return runStatus(parsed.json);
		case "verify":
			return runVerify(parsed.json);
		case "catalog":
			return runCatalog(parsed.json);
		case "report":
			return runReport(parsed.args, parsed.json);
		case "safety":
			return runSafetySurface(parsed.args, parsed.json);
		case "debug":
			return runDebug(parsed.args, parsed.json);
		case "interactive":
			return runInteractiveCli(parsed.args);
		default:
			throw new OlympiError(`unknown command: ${parsed.command}`, 2);
	}
}

function runSafetySurface(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	const subcommand = args[0];
	switch (subcommand) {
		case "check":
			return runSafety(args, json);
		case "hooks":
			return runHooks(args.slice(1), json);
		case "sandbox":
			return runSandbox(args.slice(1), json);
		case "broker":
			return runBroker(args.slice(1), json);
		case "trust":
			return runTrust(args.slice(1), json);
		default:
			throw new OlympiError(
				"usage: olympi safety [check|hooks|sandbox|broker|trust] ... [--json]",
				2,
			);
	}
}

function runDebug(args: string[], json: boolean): ExitCode | Promise<ExitCode> {
	const subcommand = args[0];
	switch (subcommand) {
		case "audit":
			return runAudit(args.slice(1), json);
		case "context":
			return runContext(args.slice(1), json);
		case "compact":
			return runCompact(args.slice(1), json);
		case "rtk":
			return runRtk(args.slice(1), json);
		case "lock":
			return runLock(args.slice(1), json);
		case "profile":
			return runProfile(args.slice(1), json);
		case "quota":
			return runQuota(args.slice(1), json);
		case "resources":
			return runResources(args.slice(1), json);
		case "prompt":
			return runPrompt(args.slice(1), json);
		case "review":
			return runReview(args.slice(1), json);
		case "handoff":
			return runHandoff(args.slice(1), json);
		case "module":
			return runModule(args.slice(1), json);
		case "extension":
			return runExtension(args.slice(1), json);
		default:
			throw new OlympiError(
				"usage: olympi debug <context|compact|rtk|quota|lock|profile|resources|prompt|review|handoff|module|extension|audit> ... [--json]",
				2,
			);
	}
}

function runPackage(args: string[], json: boolean): Promise<ExitCode> {
	const subcommand = args[0];
	switch (subcommand) {
		case "inspect":
			return runInspect(args.slice(1), json);
		case "evaluate":
			return runPackageEvaluate(args.slice(1), json);
		case "risk":
			return runReport(["package-risk", ...args.slice(1)], json);
		default:
			throw new OlympiError(
				"usage: olympi package <inspect|evaluate|risk> <source> [--json]",
				2,
			);
	}
}

function handleError(error: unknown, json: boolean): ExitCode {
	if (error instanceof OlympiError) {
		writeError(error.message, error.exitCode, json);
		return error.exitCode;
	}
	const message =
		error instanceof Error ? error.message : "unknown internal error";
	writeError(message, 5, json);
	return 5;
}

function writeError(message: string, exitCode: ExitCode, json: boolean): void {
	if (json) {
		process.stderr.write(
			`${JSON.stringify({ schemaVersion: 1, ok: false, error: { message, exitCode, code: errorCode(exitCode) } })}\n`,
		);
		return;
	}
	process.stderr.write(`olympi: ${message}\n`);
}

function errorCode(exitCode: ExitCode): string {
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

function helpText(): string {
	return `Olympi

Pi-based harness layer for agentic coding work.

Usage:
  olympi
  olympi <command> [options]
  olympi interactive

Commands:
  package       Inspect, evaluate, or report risk for Pi packages
  install       Add project-local, policy-gated Pi resources
  uninstall     Remove manifest-owned project-local resources
  setup         Inspect local harness readiness
  status        Show project-local harness state
  verify        Run harness verification gates
  catalog       Show implemented command and policy catalog
  report        Read/write status, handoff, and acceptance reports
  safety        Inspect safety gates
  interactive   Start the human-present harness console
  help all      Show grouped command forms

Model:
  default human-present; autonomous mode must be explicit in caller/provider config

Exit codes:
  0 success
  1 validation or risk findings
  2 malformed usage or input
  3 safety block
  4 unavailable platform or backend
  5 internal error
`;
}

function fullHelpText(): string {
	return `Olympi command reference

Human-present harness:
  olympi
  olympi interactive

Package intake:
  olympi package inspect <source> [--json]
  olympi package evaluate <source> [--json]
  olympi package risk <source> [--json]

Install:
  olympi install <source> --project [--dry-run|--apply] [--json]
  olympi uninstall <package-id> --project [--dry-run|--apply] [--json]

State:
  olympi status [--json]
  olympi setup status [--json]

Verification and discovery:
  olympi verify [--json]
  olympi catalog [--json]

Reports:
  olympi report status [--write] [--json]
  olympi report handoff [--write] [--statusline <pi-statusline>] [--json]
  olympi report acceptance [--write] [--json]
  olympi report package-risk <source> [--json]

Safety:
  olympi safety check [--json]
  olympi safety hooks policy [--json]
  olympi safety hooks aegis-runtime [--json]
  olympi safety hooks aegis-install --project [--dry-run|--apply] [--json]
  olympi safety sandbox check [--json]
  olympi safety broker validate <fixture> [--json]
  olympi safety trust status [--json]
  olympi safety trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]
  olympi safety trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]

Debug and authoring diagnostics:
  olympi debug context compact-advice --statusline <pi-statusline> [--after-handoff] [--json]
  olympi debug compact <fixture-or-file> [--json]
  olympi debug rtk status [--json]
  olympi debug quota status [--json]
  olympi debug lock queue <paths...> [--json]
  olympi debug resources validate [path] [--json]
  olympi debug resources install --project [--dry-run|--apply] [--json]
  olympi debug prompt contract <input-or-file> [--json]
  olympi debug review plan|diff <file> [--json]
  olympi debug handoff current [--write] [--json]
  olympi debug module status [--json]
  olympi debug extension inspect|create ... [--json]
  olympi debug audit append <event> --detail <detail> --apply [--json]
`;
}

if (import.meta.main) {
	const exitCode = await main();
	process.exit(exitCode);
}
