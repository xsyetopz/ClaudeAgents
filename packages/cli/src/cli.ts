#!/usr/bin/env bun
import { FIRST_PARTY_SKILL_INDEX } from "authoring";
import { Command, CommanderError } from "commander";
import { olympiExtensionRuntime } from "extensions";
import {
	type ExitCode,
	formatProjectStatus,
	OlympiError,
	readProjectStatus,
} from "lifecycle";
import { runAudit } from "./commands/audit.js";
import { runBroker } from "./commands/broker.js";
import { runCatalog } from "./commands/catalog.js";
import { runCompact } from "./commands/compact.js";
import { runContext } from "./commands/context.js";
import { runDoctor } from "./commands/doctor.js";
import { runExtension } from "./commands/extension.js";
import { runFeedback } from "./commands/feedback.js";
import { runHandoff } from "./commands/handoff.js";
import { runHooks } from "./commands/hooks.js";
import { runInspect } from "./commands/inspect.js";
import { runInstall } from "./commands/install.js";
import { runIntelligence } from "./commands/intelligence.js";
import { runLock } from "./commands/lock.js";
import { runModule } from "./commands/module.js";
import { runPackageEvaluate } from "./commands/package-evaluate.js";
import { runProfile } from "./commands/profile.js";
import { runPrompt } from "./commands/prompt.js";
import { runQuota } from "./commands/quota.js";
import { runReport } from "./commands/report.js";
import { runResources } from "./commands/resources.js";
import { runReview } from "./commands/review.js";
import { runSafety } from "./commands/safety.js";
import { runSandbox } from "./commands/sandbox.js";
import { runStatus } from "./commands/status.js";
import { runTrust } from "./commands/trust.js";
import { runUninstall } from "./commands/uninstall.js";
import { runVerify } from "./commands/verify.js";
import { runInteractiveCli } from "./interactive.ts";

const COMMANDER_QUOTED_COMMAND_PATTERN = /'([^']+)'/;
const COMMANDER_ERROR_PREFIX_PATTERN = /^error:\s*/i;
const PUBLIC_TOP_LEVEL_COMMANDS = [
	"install",
	"uninstall",
	"status",
	"doctor",
	"report",
	"help",
] as const;
const TOP_LEVEL_COMMANDS = [
	...PUBLIC_TOP_LEVEL_COMMANDS,
	"dev",
	"package",
	"safety",
	"debug",
	"interactive",
] as const;
const DEV_COMMANDS = [
	"package",
	"install",
	"uninstall",
	"doctor",
	"verify",
	"catalog",
	"hooks",
	"intelligence",
	"feedback",
	"skills",
	"provenance",
] as const;
const SAFETY_COMMANDS = [
	"check",
	"hooks",
	"sandbox",
	"broker",
	"trust",
] as const;
const DEBUG_COMMANDS = [
	"context",
	"compact",
	"quota",
	"lock",
	"profile",
	"resources",
	"prompt",
	"review",
	"handoff",
	"module",
	"extension",
	"audit",
] as const;
const PACKAGE_COMMANDS = ["inspect", "evaluate", "risk"] as const;

/** Run the Olympi CLI and return a process-style exit code. */
export async function main(
	argv: string[] = process.argv.slice(2),
): Promise<ExitCode> {
	const json = argv.includes("--json");
	try {
		preflightTopLevelCommand(argv);
		const program = createCliProgram(argv);
		await program.parseAsync(argv, { from: "user" });
		return (program.getOptionValue("exitCode") as ExitCode | undefined) ?? 0;
	} catch (error) {
		return handleError(normalizeCommanderError(error), json);
	}
}

function preflightTopLevelCommand(argv: string[]): void {
	const command = argv.find((arg) => !arg.startsWith("-"));
	if (command === undefined) return;
	if ((TOP_LEVEL_COMMANDS as readonly string[]).includes(command)) return;
	throw new OlympiError(`Unknown command: ${command}`, 2, {
		input: command,
		expected: PUBLIC_TOP_LEVEL_COMMANDS.join(", "),
		written: [],
	});
}

export function createCliProgram(argv: string[] = []): Command {
	const json = argv.includes("--json");
	const runtime = olympiExtensionRuntime();
	const program = new Command();
	program
		.name("olympi")
		.description(
			`Pi extension/harness CLI entrypoint for ${runtime.stateRoot} project state.`,
		)
		.option("--json", "emit stable JSON where supported")
		.exitOverride()
		.addHelpCommand(false)
		.configureOutput({
			writeOut: (text) => process.stdout.write(text),
			writeErr: () => undefined,
			outputError: () => undefined,
		});
	program.helpInformation = () => helpText();
	program.action(() => {
		process.stdout.write(helpText());
		setExitCode(program, 0);
	});

	program
		.command("help")
		.description("Show help")
		.argument("[topic]", "help topic")
		.allowExcessArguments(false)
		.action((topic: string | undefined) => {
			if (topic === undefined) {
				process.stdout.write(helpText());
				setExitCode(program, 0);
				return;
			}
			switch (topic) {
				case "all":
					process.stdout.write(fullHelpText());
					setExitCode(program, 0);
					return;
				default:
					throw invalidSubcommand("help", topic, ["all"]);
			}
		});

	forwardCommand(program, "dev", "Developer and power-user tools", (args) =>
		runDeveloper(args, json),
	);
	forwardCommand(
		program,
		"package",
		"Inspect or evaluate a local Pi package",
		(args) => runPackage(args, json),
	);
	forwardCommand(
		program,
		"install",
		"Install a passive package into project-local state",
		(args) => runInstall(args, json),
	);
	forwardCommand(
		program,
		"uninstall",
		"Remove manifest-owned project-local package state",
		(args) => runUninstall(args, json),
	);
	forwardCommand(program, "status", "Show current project state", () =>
		runStatus(json),
	);
	forwardCommand(
		program,
		"doctor",
		"Check install, runtime, RTK, Pi, and state",
		() => runDoctor(json),
	);
	forwardCommand(program, "report", "Show reports", (args) =>
		runReport(args, json),
	);
	forwardCommand(program, "safety", "Inspect safety stops", (args) =>
		runSafetySurface(args, json),
	);
	forwardCommand(program, "debug", "Run diagnostics", (args) =>
		runDebug(args, json),
	);
	forwardCommand(program, "interactive", "Start interactive mode", (args) =>
		runInteractiveCli(args),
	);
	return program;
}

function forwardCommand(
	program: Command,
	name: string,
	description: string,
	action: (args: string[]) => ExitCode | Promise<ExitCode>,
): void {
	program
		.command(name)
		.description(description)
		.argument("[args...]", "command arguments and options")
		.allowUnknownOption(true)
		.allowExcessArguments(true)
		.action(async (args: string[]) => {
			setExitCode(program, await action(args));
		});
}

function setExitCode(program: Command, exitCode: ExitCode): void {
	program.setOptionValue("exitCode", exitCode);
}

function runDeveloper(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	const subcommand = args[0];
	switch (subcommand) {
		case "package":
			return runPackage(args.slice(1), json);
		case "install":
			return runInstall(args.slice(1), json);
		case "uninstall":
			return runUninstall(args.slice(1), json);
		case "doctor":
			return runDoctor(json);
		case "verify":
			return runVerify(json);
		case "catalog":
			return runCatalog(json);
		case "hooks":
			return runHooks(args.slice(1), json);
		case "intelligence":
			return runIntelligence(args.slice(1), json);
		case "feedback":
			return runFeedback(args.slice(1), json);
		case "skills":
			return runDeveloperSkills(json);
		case "provenance":
			return runDeveloperProvenance(json);
		default:
			throw invalidSubcommand("dev", subcommand, DEV_COMMANDS);
	}
}

function runDeveloperSkills(json: boolean): ExitCode {
	const report = {
		schemaVersion: 1 as const,
		command: "dev skills" as const,
		skills: FIRST_PARTY_SKILL_INDEX.map((skill) => ({
			name: skill.name,
			description: skill.description,
			triggers: skill.triggers,
		})),
	};
	if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	else {
		process.stdout.write(
			`Olympi developer skills\n${report.skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n")}\n`,
		);
	}
	return 0;
}

async function runDeveloperProvenance(json: boolean): Promise<ExitCode> {
	const status = await readProjectStatus(process.cwd());
	const report = {
		schemaVersion: 1 as const,
		command: "dev provenance" as const,
		manifestPackages: status.manifestPackages,
		lockRecords: status.lockRecords,
		auditEvents: status.auditEvents,
		warnings: status.warnings,
		packages: status.packages,
	};
	if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	else process.stdout.write(formatProjectStatus(status));
	return status.warnings.length > 0 ? 1 : 0;
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
			throw invalidSubcommand("safety", subcommand, SAFETY_COMMANDS);
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
			throw invalidSubcommand("debug", subcommand, DEBUG_COMMANDS);
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
			throw invalidSubcommand("package", subcommand, PACKAGE_COMMANDS);
	}
}

function invalidSubcommand(
	parent: string,
	input: string | undefined,
	allowed: readonly string[],
): OlympiError {
	const value = input ?? "<missing>";
	return new OlympiError(
		`Invalid subcommand for ${parent}: ${value}; expected one of ${allowed.join(", ")}`,
		2,
		{
			input: value,
			expected: allowed.join(", "),
			written: [],
		},
	);
}

function normalizeCommanderError(error: unknown): unknown {
	if (!(error instanceof CommanderError)) return error;
	if (error.exitCode === 0) return new OlympiError("Help displayed", 0);
	if (error.code === "commander.unknownCommand") {
		const input = commandFromCommanderMessage(error.message);
		return new OlympiError(`Unknown command: ${input}`, 2, {
			input,
			expected: PUBLIC_TOP_LEVEL_COMMANDS.join(", "),
			written: [],
		});
	}
	return new OlympiError(
		`CLI parse failed: ${stripCommanderPrefix(error.message)}`,
		2,
		{
			input: stripCommanderPrefix(error.message),
			expected: "olympi <command> [options]",
			written: [],
		},
	);
}

function commandFromCommanderMessage(message: string): string {
	return message.match(COMMANDER_QUOTED_COMMAND_PATTERN)?.[1] ?? "<unknown>";
}

function stripCommanderPrefix(message: string): string {
	return message.replace(COMMANDER_ERROR_PREFIX_PATTERN, "");
}

function handleError(error: unknown, json: boolean): ExitCode {
	if (error instanceof OlympiError) {
		if (error.exitCode === 0) return 0;
		writeError(error, json);
		return error.exitCode;
	}
	const message =
		error instanceof Error ? error.message : "unknown internal error";
	writeError(new OlympiError(message, 5, { written: [] }), json);
	return 5;
}

function writeError(error: OlympiError, json: boolean): void {
	if (json) {
		const payload = {
			schemaVersion: 1 as const,
			ok: false,
			error: {
				code: error.code ?? errorCode(error.exitCode),
				message: error.message,
				exitCode: error.exitCode,
				...(error.input === undefined ? {} : { input: error.input }),
				...(error.expected === undefined ? {} : { expected: error.expected }),
			},
			written: error.written ?? [],
		};
		process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
		return;
	}
	const details = [
		...(error.input === undefined ? [] : [`input: ${error.input}`]),
		...(error.expected === undefined ? [] : [`expected: ${error.expected}`]),
		`written: ${(error.written ?? []).join(", ") || "none"}`,
	];
	process.stderr.write(`olympi: ${error.message}\n${details.join("\n")}\n`);
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

Pi extension/harness layer with safe defaults.

Usage:
  olympi
  olympi install --dry-run
  olympi install --apply
  olympi doctor
  olympi status

Commands:
  install       Register Olympi resources into Pi project-local state
  uninstall     Remove manifest-owned Olympi resources
  doctor        Check install, runtime, RTK, Pi, hooks, slash resources, and state
  status        Inspect project-local state
  report        Emit admin/CI status or handoff reports
  help all      Show admin/developer reference

Pi workflow surface:
  Use Pi slash commands after install: /olympi-goal, /olympi-plan,
  /olympi-execute, /olympi-complete, /olympi-resume, /olympi-handoff, /olympi-doctor,
  /olympi-status, /olympi-feedback, /olympi-context, and /skill:olympi-*

Model:
  Pi is the host; Olympi runs within Pi as a first-party extension/harness layer
  CLI is bootstrap/admin only; normal workflows live in Pi slash commands, skills, hooks, and tool shims

Exit codes:
  0 success
  1 validation or risk findings
  2 malformed usage or input
  3 safety block
  4 unavailable platform/backend; 5 internal error
`;
}

function fullHelpText(): string {
	return `Olympi command reference

Default user workflow:
  Olympi runs within Pi as a first-party extension/harness layer.
  Pi invokes Olympi through the default project-local extension entrypoint, explicit --global registration, or a one-off -e path.
  Normal user/agent workflows are Pi slash commands, prompt templates, skills, hooks, and tool shims:
  /olympi-goal <goal>
  /olympi-plan <goal-id> <step>
  /olympi-execute <goal-id> --step <step-id> --command <command>
  /olympi-complete <goal-id>
  /olympi-resume <goal-id>
  /olympi-handoff
  /olympi-doctor
  /olympi-status
  /olympi-feedback <note>
  /olympi-context [path]
  /skill:olympi-goal-loop, /skill:olympi-code-intelligence, /skill:olympi-caveman-output

CLI bootstrap/admin workflow:
  The CLI installs/uninstalls/registers Pi resources, reports health/status, and supports CI/dev automation.
  Package-manager global CLI install is not Pi extension registration.
  Outside the product surface: implicit global Pi writes or undeclared global/provider-home writes.
  olympi install [--dry-run|--apply] [--global --confirm-global --provenance explicit-user-approval] [--json]
  olympi uninstall [--dry-run|--apply] [--json]
  olympi status [--json]
  olympi doctor [--json]
  olympi report status [--json]
  olympi report handoff [--statusline <pi-statusline>] [--json]
  Olympi routes command execution through RTK automatically. Unsupported commands are proxied through RTK; agents must not bypass this path.

Developer/CI/admin workflow (not normal user workflow):
  olympi dev doctor [--json]
  olympi dev verify [--json]
  olympi dev catalog [--json]
  olympi dev package inspect <source> [--json]
  olympi dev package evaluate <source> [--json]
  olympi dev package risk <source> [--json]
  olympi dev install <source> --project [--dry-run|--apply] [--json]
  olympi dev uninstall <package-id> --project [--dry-run|--apply] [--json]
  olympi dev hooks policy [--json]
  olympi dev intelligence status|refresh|context [--json]
  olympi dev feedback list|record [--json]
  olympi dev skills [--json]
  olympi dev provenance [--json]
  olympi safety check [--json]

Internal CI/developer forms (not normal user workflow):
  bun run olympi:verify -- --json
  bun run olympi:catalog -- --json
  olympi dev verify [--json]
  olympi dev catalog [--json]
  olympi dev package inspect|evaluate|risk <source> [--json]
  olympi dev intelligence status|refresh|context [--json]
  olympi dev feedback list|record [--json]
  olympi package inspect|evaluate|risk <source> [--json]
  olympi safety check|hooks|sandbox|broker|trust ... [--json]
  olympi debug ... [--json]


Reports:
  olympi report status [--write] [--json]
  olympi report handoff [--write] [--statusline <pi-statusline>] [--json]
  olympi report acceptance [--write] [--json]
  olympi report package-risk <source> [--json]

Safety:
  olympi safety check [--json]
  olympi safety hooks policy [--json]
  olympi safety hooks aegis-runtime [--json]
  olympi safety hooks aegis-install [--project|--global] [--dry-run|--apply] [--confirm-global --provenance explicit-user-approval] [--json]
  olympi safety sandbox check [--json]
  olympi safety broker validate <fixture> [--json]
  olympi safety trust status [--json]
  olympi safety trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]
  olympi safety trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]

Debug and authoring diagnostics:
  olympi debug context compact-advice --statusline <pi-statusline> [--after-handoff] [--json]
  olympi debug compact <fixture-or-file> [--json]
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
