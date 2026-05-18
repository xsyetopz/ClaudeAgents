#!/usr/bin/env bun
import { runBroker } from "./commands/broker";
import { runCatalog } from "./commands/catalog";
import { runCompact } from "./commands/compact";
import { runExtension } from "./commands/extension";
import { runHandoff } from "./commands/handoff";
import { runHooks } from "./commands/hooks";
import { runInspect } from "./commands/inspect";
import { runInstall } from "./commands/install";
import { runModule } from "./commands/module";
import { runPackageEvaluate } from "./commands/package-evaluate";
import { runPlan } from "./commands/plan";
import { runPrompt } from "./commands/prompt";
import { runQuota } from "./commands/quota";
import { runReport } from "./commands/report";
import { runResources } from "./commands/resources";
import { runReview } from "./commands/review";
import { runRtk } from "./commands/rtk";
import { runSafety } from "./commands/safety";
import { runSandbox } from "./commands/sandbox";
import { runStatus } from "./commands/status";
import { runTrust } from "./commands/trust";
import { runUninstall } from "./commands/uninstall";
import { runVerify } from "./commands/verify";
import { runInteractiveCli } from "./interactive";
import { type ExitCode, OlympusError } from "./types";

interface ParsedArgs {
	command: string | undefined;
	args: string[];
	json: boolean;
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
	const withoutGlobalFlags = argv.filter((arg) => arg !== "--json");
	return {
		command: withoutGlobalFlags[0],
		args: withoutGlobalFlags.slice(1),
		json,
	};
}

function dispatch(parsed: ParsedArgs): ExitCode | Promise<ExitCode> {
	if (
		parsed.command === undefined ||
		parsed.command === "help" ||
		parsed.command === "--help"
	) {
		process.stdout.write(helpText());
		return 0;
	}
	if (parsed.command === "inspect") return runInspect(parsed.args, parsed.json);
	if (parsed.command === "catalog") return runCatalog(parsed.json);
	if (parsed.command === "spec") return runCatalog(parsed.json);
	if (parsed.command === "status") return runStatus(parsed.json);
	if (parsed.command === "report") return runReport(parsed.args, parsed.json);
	if (parsed.command === "compact") return runCompact(parsed.args, parsed.json);
	if (parsed.command === "rtk") return runRtk(parsed.args, parsed.json);
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
	if (subcommand === "evaluate") return runPackageEvaluate(args.slice(1), json);
	throw new OlympusError(
		"usage: olympus package evaluate <source> [--json]",
		2,
	);
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
		process.stderr.write(`${JSON.stringify({ error: message, exitCode })}\n`);
		return;
	}
	process.stderr.write(`olympus: ${message}\n`);
}

function helpText(): string {
	return `Olympus low-level CLI

Usage:
  olympus inspect <local-package-path> [--json]
  olympus package evaluate <source> [--json]
  olympus package-evaluate <source> [--json]
  olympus catalog [--json]
  olympus status [--json]
  olympus report status [--json]
  olympus report handoff [--json]
  olympus report acceptance [--json]
  olympus compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]
  olympus rtk status [--json]
  olympus quota status [--json]
  olympus safety check [--json]
  olympus hooks policy [--json]
  olympus sandbox check [--json]
  olympus broker validate <fixture> [--json]
  olympus trust status [--json]
  olympus resources validate [path] [--json]
  olympus prompt contract <input-or-file> [--json]
  olympus review plan <plan-file> [--json]
  olympus review diff <diff-file> [--json]
  olympus handoff current [--json]
  olympus module status [--json]
  olympus module run <module> --dry-run [--json]
  olympus plan <operation> [source] [--json]
  olympus verify [--json]
  olympus interactive
  olympus extension inspect <path> [--json]
  olympus extension create <name> [--dry-run|--apply --output <directory>] [--json]
  olympus install <source> --project [--dry-run|--apply] [--json]
  olympus uninstall <package-id> --project [--dry-run|--apply] [--json]

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
