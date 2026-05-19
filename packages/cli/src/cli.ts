#!/usr/bin/env bun
import { type ExitCode, OlympusError } from "lifecycle";
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
	throw new OlympusError(`unknown command: ${parsed.command}`, 2);
}

function runPackage(args: string[], json: boolean): Promise<ExitCode> {
	const subcommand = args[0];
	if (subcommand === "inspect") return runInspect(args.slice(1), json);
	if (subcommand === "evaluate") return runPackageEvaluate(args.slice(1), json);
	if (subcommand === "eval") return runPackageEvaluate(args.slice(1), json);
	if (subcommand === "risk") {
		return runReport(["package-risk", ...args.slice(1)], json);
	}
	throw new OlympusError(
		"usage: olympus package <inspect|evaluate|risk> <source> [--json]",
		2,
	);
}

function runState(args: string[], json: boolean): Promise<ExitCode> {
	const subcommand = args[0] ?? "inspect";
	if (subcommand === "inspect" || subcommand === "status") {
		return runStatus(json);
	}
	throw new OlympusError("usage: olympus state [inspect|status] [--json]", 2);
}

function handleError(error: unknown, json: boolean): ExitCode {
	if (error instanceof OlympusError) {
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
	process.stderr.write(`olympus: ${message}\n`);
}

function errorCode(exitCode: ExitCode): string {
	if (exitCode === 1) return "VALIDATION_OR_RISK_FINDINGS";
	if (exitCode === 2) return "MALFORMED_USAGE_OR_INPUT";
	if (exitCode === 3) return "SAFETY_BLOCK";
	if (exitCode === 4) return "UNAVAILABLE_PLATFORM_OR_BACKEND";
	return "INTERNAL_ERROR";
}

function helpText(): string {
	return `Olympus CLI

Usage:
  olympus <command> [--json]
  olympus interactive

Core package commands:
  olympus inspect <local-package-path> [--json]
  olympus package evaluate <source> [--json]
  olympus evaluate <source> [--json]
  olympus eval <source> [--json]
  olympus package-evaluate <source> [--json]
  olympus package inspect <source> [--json]
  olympus package risk <source> [--json]
  olympus risk <source> [--json]

Plan, install, uninstall:
  olympus plan install <source> [--json]
  olympus plan uninstall <package-id> [--json]
  olympus install <source> --project [--dry-run|--apply] [--json]
  olympus install <source> --project --executable [--signature-digest <sha256>] [--dry-run|--apply] [--json]
  olympus uninstall <package-id> --project [--dry-run|--apply] [--json]

Status, setup, acceptance:
  olympus catalog [--json]
  olympus spec [--json]
  olympus setup status [--json]
  olympus status [--json]
  olympus state [inspect|status] [--json]
  olympus verify [--json]
  olympus check [--json]
  olympus accept [--json]

Reports and efficiency:
  olympus report status [--json]
  olympus report status --write [--json]
  olympus report handoff [--json]
  olympus report handoff --write [--statusline <pi-statusline>] [--json]
  olympus report acceptance [--json]
  olympus report acceptance --write [--json]
  olympus report package-risk <source> [--json]
  olympus handoff current --write [--statusline <pi-statusline>] [--json]
  olympus audit append <event> --detail <detail> --apply [--json]
  olympus context compact-advice --statusline <pi-statusline> --after-handoff [--json]
  olympus compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]
  olympus rtk status [--json]
  olympus rtk plan <command...> [--json]
  olympus quota status [--json]
  olympus lock queue <paths...> [--json]
  olympus profile status [--json]
  olympus profile set --name <name> [--apply] [--json]

Safety and runtime policy:
  olympus safety check [--json]
  olympus hooks policy [--json]
  olympus hooks aegis-runtime [--json]
  olympus hooks aegis-install --project [--dry-run|--apply] [--json]
  olympus sandbox check [--json]
  olympus broker validate <fixture> [--json]
  olympus trust status [--json]
  olympus trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]
  olympus trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]

Authoring and workflow:
  olympus resources validate [path] [--json]
  olympus resources install --project [--dry-run|--apply] [--json]
  olympus prompt contract <input-or-file> [--json]
  olympus review plan <plan-file> [--json]
  olympus review diff <diff-file> [--json]
  olympus handoff current [--json]
  olympus module status [--json]
  olympus module run <module> --dry-run [--json]
  olympus module hephaestus proof <plan-file> [--json]
  olympus module hephaestus apply <plan-file> [--apply] [--json]
  olympus extension inspect <path> [--json]
  olympus extension create <name> [--dry-run|--apply --output <directory>] [--json]

Interactive:
  olympus interactive

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
