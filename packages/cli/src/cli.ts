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
import { runPlan } from "./commands/plan.js";
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
	if (
		parsed.help ||
		parsed.command === undefined ||
		parsed.command === "help" ||
		parsed.command === "--help"
	) {
		process.stdout.write(helpText());
		return 0;
	}
	if (parsed.command === "inspect") return runInspect(parsed.args, parsed.json);
	if (parsed.command === "evaluate" || parsed.command === "eval") {
		return runPackageEvaluate(parsed.args, parsed.json);
	}
	if (parsed.command === "risk") {
		return runReport(["package-risk", ...parsed.args], parsed.json);
	}
	if (parsed.command === "catalog") return runCatalog(parsed.json);
	if (parsed.command === "spec") return runCatalog(parsed.json);
	if (parsed.command === "status") return runStatus(parsed.json);
	if (parsed.command === "state") return runState(parsed.args, parsed.json);
	if (parsed.command === "setup") return runSetup(parsed.args, parsed.json);
	if (parsed.command === "report") return runReport(parsed.args, parsed.json);
	if (parsed.command === "audit") return runAudit(parsed.args, parsed.json);
	if (parsed.command === "context") return runContext(parsed.args, parsed.json);
	if (parsed.command === "compact") return runCompact(parsed.args, parsed.json);
	if (parsed.command === "rtk") return runRtk(parsed.args, parsed.json);
	if (parsed.command === "lock") return runLock(parsed.args, parsed.json);
	if (parsed.command === "profile") return runProfile(parsed.args, parsed.json);
	if (parsed.command === "quota") return runQuota(parsed.args, parsed.json);
	if (parsed.command === "safety") return runSafety(parsed.args, parsed.json);
	if (parsed.command === "hooks") return runHooks(parsed.args, parsed.json);
	if (parsed.command === "sandbox") return runSandbox(parsed.args, parsed.json);
	if (parsed.command === "broker") return runBroker(parsed.args, parsed.json);
	if (parsed.command === "trust") return runTrust(parsed.args, parsed.json);
	if (parsed.command === "resources")
		return runResources(parsed.args, parsed.json);
	if (parsed.command === "prompt") return runPrompt(parsed.args, parsed.json);
	if (parsed.command === "review") return runReview(parsed.args, parsed.json);
	if (parsed.command === "handoff") return runHandoff(parsed.args, parsed.json);
	if (parsed.command === "module") return runModule(parsed.args, parsed.json);
	if (parsed.command === "plan") return runPlan(parsed.args, parsed.json);
	if (parsed.command === "verify") return runVerify(parsed.json);
	if (parsed.command === "check") return runVerify(parsed.json);
	if (parsed.command === "accept") {
		return runReport(["acceptance"], parsed.json);
	}
	if (parsed.command === "extension")
		return runExtension(parsed.args, parsed.json);
	if (parsed.command === "package-evaluate")
		return runPackageEvaluate(parsed.args, parsed.json);
	if (parsed.command === "package") return runPackage(parsed.args, parsed.json);
	if (parsed.command === "interactive") return runInteractiveCli(parsed.args);
	if (parsed.command === "install") return runInstall(parsed.args, parsed.json);
	if (parsed.command === "uninstall")
		return runUninstall(parsed.args, parsed.json);
	throw new OlympiError(`unknown command: ${parsed.command}`, 2);
}

function runPackage(args: string[], json: boolean): Promise<ExitCode> {
	const subcommand = args[0];
	if (subcommand === "inspect") return runInspect(args.slice(1), json);
	if (subcommand === "evaluate") return runPackageEvaluate(args.slice(1), json);
	if (subcommand === "eval") return runPackageEvaluate(args.slice(1), json);
	if (subcommand === "risk") {
		return runReport(["package-risk", ...args.slice(1)], json);
	}
	throw new OlympiError(
		"usage: olympi package <inspect|evaluate|risk> <source> [--json]",
		2,
	);
}

function runState(args: string[], json: boolean): Promise<ExitCode> {
	const subcommand = args[0] ?? "inspect";
	if (subcommand === "inspect" || subcommand === "status") {
		return runStatus(json);
	}
	throw new OlympiError("usage: olympi state [inspect|status] [--json]", 2);
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
	if (exitCode === 1) return "VALIDATION_OR_RISK_FINDINGS";
	if (exitCode === 2) return "MALFORMED_USAGE_OR_INPUT";
	if (exitCode === 3) return "SAFETY_BLOCK";
	if (exitCode === 4) return "UNAVAILABLE_PLATFORM_OR_BACKEND";
	return "INTERNAL_ERROR";
}

function helpText(): string {
	return `Olympi CLI

Usage:
  olympi <command> [--json]
  olympi interactive

Core package commands:
  olympi inspect <local-package-path> [--json]
  olympi package evaluate <source> [--json]
  olympi evaluate <source> [--json]
  olympi eval <source> [--json]
  olympi package-evaluate <source> [--json]
  olympi package inspect <source> [--json]
  olympi package risk <source> [--json]
  olympi risk <source> [--json]

Plan, install, uninstall:
  olympi plan install <source> [--json]
  olympi plan uninstall <package-id> [--json]
  olympi install <source> --project [--dry-run|--apply] [--json]
  olympi install <source> --project --executable [--signature-digest <sha256>] [--dry-run|--apply] [--json]
  olympi uninstall <package-id> --project [--dry-run|--apply] [--json]

Status, setup, acceptance:
  olympi catalog [--json]
  olympi spec [--json]
  olympi setup status [--json]
  olympi status [--json]
  olympi state [inspect|status] [--json]
  olympi verify [--json]
  olympi check [--json]
  olympi accept [--json]

Reports and efficiency:
  olympi report status [--json]
  olympi report status --write [--json]
  olympi report handoff [--json]
  olympi report handoff --write [--statusline <pi-statusline>] [--json]
  olympi report acceptance [--json]
  olympi report acceptance --write [--json]
  olympi report package-risk <source> [--json]
  olympi handoff current --write [--statusline <pi-statusline>] [--json]
  olympi audit append <event> --detail <detail> --apply [--json]
  olympi context compact-advice --statusline <pi-statusline> --after-handoff [--json]
  olympi compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]
  olympi rtk status [--json]
  olympi rtk plan <command...> [--json]
  olympi quota status [--json]
  olympi lock queue <paths...> [--json]
  olympi profile status [--json]
  olympi profile set --name <name> [--apply] [--json]

Safety and runtime policy:
  olympi safety check [--json]
  olympi hooks policy [--json]
  olympi hooks aegis-runtime [--json]
  olympi hooks aegis-install --project [--dry-run|--apply] [--json]
  olympi sandbox check [--json]
  olympi broker validate <fixture> [--json]
  olympi trust status [--json]
  olympi trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]
  olympi trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]

Authoring and workflow:
  olympi resources validate [path] [--json]
  olympi resources install --project [--dry-run|--apply] [--json]
  olympi prompt contract <input-or-file> [--json]
  olympi review plan <plan-file> [--json]
  olympi review diff <diff-file> [--json]
  olympi handoff current [--json]
  olympi module status [--json]
  olympi module run <module> --dry-run [--json]
  olympi module hephaestus proof <plan-file> [--json]
  olympi module hephaestus apply <plan-file> [--apply] [--json]
  olympi extension inspect <path> [--json]
  olympi extension create <name> [--dry-run|--apply --output <directory>] [--json]

Interactive:
  olympi interactive

Blocked/obsolete OAL surfaces:
  Provider renderers, Codex/Claude/OpenCode adapter generation, provider-home deploy,
  global ~/.pi writes, live provider e2e, and OAL compatibility mode are not restored.

Exit codes:
  0 success
  1 validation or risk findings
  2 malformed usage or input
  3 safety block
  4 unavailable platform or backend
  5 internal error
`;
}

if (import.meta.main) {
	const exitCode = await main();
	process.exit(exitCode);
}
