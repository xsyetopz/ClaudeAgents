import { statSync } from "node:fs";
import path from "node:path";

const RTK_BINARY_NAMES = ["rtk", "rtk-cli"] as const;
const SHELL_OPERATOR_PATTERN =
	/(?:^|\s)(?:&&|\|\||\||;|>|<|>>|2>|&)(?:\s|$)|[`$(){}*?]/;
const ENV_ASSIGNMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const COMMAND_TOKEN_PATTERN = /(?:"[^"]*"|'[^']*'|\S+)/g;
const QUOTED_TOKEN_PATTERN = /^(["'])(.*)\1$/;

export type RtkCommandKind =
	| "git"
	| "grep"
	| "find"
	| "ls"
	| "tree"
	| "read"
	| "test"
	| "typescript"
	| "lint"
	| "format"
	| "package-manager"
	| "curl"
	| "unsupported";

export type RtkRouteKind = "native-equivalent" | "proxy-pass-through";

export interface RtkCommandRoute {
	schemaVersion: 1;
	originalCommand: string;
	commandKind: RtkCommandKind;
	routeKind: RtkRouteKind;
	supportedEquivalent: boolean;
	rtkExecutableName: string;
	rtkExecutablePath: string | null;
	rtkCommand: string[];
	rtkCommandText: string;
	reason: string;
	required: true;
}

export interface RtkRouteBlocker {
	code: "RTK_EXECUTABLE_NOT_FOUND" | "RTK_BYPASS_BLOCKED" | "RTK_PROXY_FAILED";
	originalCommand: string;
	attemptedBypassCommand?: string;
	attemptedAction?: string;
	requiredRtkRoute: string;
	written: [];
}

export interface RtkExecutionResult {
	schemaVersion: 1;
	route: RtkCommandRoute;
	blocked: boolean;
	blocker: RtkRouteBlocker | null;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	failureReason: string | null;
}

export function planRtkRoute(
	originalCommand: string,
	env: NodeJS.ProcessEnv = process.env,
): RtkCommandRoute {
	const rtkExecutablePath = findRtkOnPath(env["PATH"] ?? "");
	const rtkExecutableName = rtkExecutablePath ?? "rtk";
	const tokens = commandTokens(originalCommand);
	const meaningfulTokens = stripEnvironmentAssignments(tokens);
	const commandKind = classifyRtkCommandKind(meaningfulTokens);
	const route = rtkRouteArguments(
		commandKind,
		originalCommand,
		meaningfulTokens,
	);
	const rtkCommand = [rtkExecutableName, ...route.arguments];
	return {
		schemaVersion: 1,
		originalCommand,
		commandKind,
		routeKind: route.routeKind,
		supportedEquivalent: route.routeKind === "native-equivalent",
		rtkExecutableName,
		rtkExecutablePath,
		rtkCommand,
		rtkCommandText: rtkCommand.join(" "),
		reason:
			route.routeKind === "native-equivalent"
				? `supported ${commandKind} command routes to RTK equivalent`
				: "unsupported command routes through RTK proxy/pass-through",
		required: true,
	};
}

export function rtkMissingExecutableBlocker(
	route: RtkCommandRoute,
): RtkRouteBlocker | null {
	return route.rtkExecutablePath === null
		? {
				code: "RTK_EXECUTABLE_NOT_FOUND",
				originalCommand: route.originalCommand,
				requiredRtkRoute: route.rtkCommandText,
				written: [],
			}
		: null;
}

export function rtkProxyFailureBlocker(
	route: RtkCommandRoute,
	exitCode: number,
): RtkRouteBlocker {
	return {
		code: "RTK_PROXY_FAILED",
		originalCommand: route.originalCommand,
		requiredRtkRoute: route.rtkCommandText,
		attemptedAction: `RTK command exited ${exitCode}`,
		written: [],
	};
}

export function rtkBypassBlocker(options: {
	originalCommand: string;
	attemptedBypassCommand?: string;
	attemptedAction?: string;
	requiredRtkRoute: string;
}): RtkRouteBlocker {
	return {
		code: "RTK_BYPASS_BLOCKED",
		originalCommand: options.originalCommand,
		...(options.attemptedBypassCommand === undefined
			? {}
			: { attemptedBypassCommand: options.attemptedBypassCommand }),
		...(options.attemptedAction === undefined
			? {}
			: { attemptedAction: options.attemptedAction }),
		requiredRtkRoute: options.requiredRtkRoute,
		written: [],
	};
}

export async function executeViaRtk(options: {
	originalCommand: string;
	cwd: string;
	env?: NodeJS.ProcessEnv;
}): Promise<RtkExecutionResult> {
	const route = planRtkRoute(
		options.originalCommand,
		options.env ?? process.env,
	);
	const missing = rtkMissingExecutableBlocker(route);
	if (missing !== null) {
		return {
			schemaVersion: 1,
			route,
			blocked: true,
			blocker: missing,
			exitCode: null,
			stdout: "",
			stderr: "",
			failureReason: `RTK executable not found: ${route.rtkExecutableName}`,
		};
	}
	const [executable, ...args] = route.rtkCommand;
	if (executable === undefined) {
		return {
			schemaVersion: 1,
			route,
			blocked: true,
			blocker: missingExecutableFromEmptyRoute(route),
			exitCode: null,
			stdout: "",
			stderr: "",
			failureReason: "RTK executable not found: rtk",
		};
	}
	const proc = Bun.spawn([executable, ...args], {
		cwd: options.cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, ...(options.env ?? {}) },
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	const failed = exitCode !== 0;
	return {
		schemaVersion: 1,
		route,
		blocked: false,
		blocker: failed ? rtkProxyFailureBlocker(route, exitCode) : null,
		exitCode,
		stdout,
		stderr,
		failureReason: failed ? `RTK proxy failed: exit code ${exitCode}` : null,
	};
}

export function classifyRtkCommandKind(tokens: string[]): RtkCommandKind {
	const executable = executableName(tokens[0] ?? "");
	switch (executable) {
		case "git":
			return "git";
		case "rg":
		case "grep":
			return "grep";
		case "find":
			return "find";
		case "ls":
			return "ls";
		case "tree":
			return "tree";
		case "cat":
		case "head":
		case "tail":
		case "less":
			return "read";
		case "jest":
		case "vitest":
		case "pytest":
		case "rspec":
			return "test";
		case "tsc":
			return "typescript";
		case "eslint":
			return "lint";
		case "prettier":
			return "format";
		case "npm":
		case "npx":
		case "pnpm":
			return "package-manager";
		case "curl":
			return "curl";
		case "bun":
			return classifyBunCommand(tokens);
		case "bunx":
			return classifyBunxCommand(tokens);
		default:
			return "unsupported";
	}
}

function classifyBunCommand(tokens: string[]): RtkCommandKind {
	const subcommand = tokens[1] ?? "";
	switch (subcommand) {
		case "test":
			return "test";
		case "run":
			return classifyBunRunCommand(tokens[2] ?? "");
		default:
			return "unsupported";
	}
}

function classifyBunRunCommand(scriptName: string): RtkCommandKind {
	switch (scriptName) {
		case "test":
		case "olympi:test":
			return "test";
		case "typecheck":
			return "typescript";
		case "biome:check":
			return "format";
		default:
			return "unsupported";
	}
}

function classifyBunxCommand(tokens: string[]): RtkCommandKind {
	const tool = executableName(tokens[1] ?? "");
	switch (tool) {
		case "tsc":
			return "typescript";
		case "eslint":
			return "lint";
		case "prettier":
		case "biome":
			return "format";
		default:
			return "unsupported";
	}
}

function rtkRouteArguments(
	kind: RtkCommandKind,
	originalCommand: string,
	tokens: string[],
): { routeKind: RtkRouteKind; arguments: string[] } {
	switch (kind) {
		case "git":
			return {
				routeKind: "native-equivalent",
				arguments: ["git", ...tokens.slice(1)],
			};
		case "grep":
			return {
				routeKind: "native-equivalent",
				arguments: ["grep", ...tokens.slice(1)],
			};
		case "find":
			return {
				routeKind: "native-equivalent",
				arguments: ["find", ...tokens.slice(1)],
			};
		case "ls":
			return {
				routeKind: "native-equivalent",
				arguments: ["ls", ...tokens.slice(1)],
			};
		case "tree":
			return {
				routeKind: "native-equivalent",
				arguments: ["tree", ...tokens.slice(1)],
			};
		case "read":
			return readRouteArguments(tokens);
		case "test":
			return { routeKind: "native-equivalent", arguments: ["test", ...tokens] };
		case "typescript":
			return {
				routeKind: "native-equivalent",
				arguments: ["tsc", ...tokens.slice(1)],
			};
		case "lint":
			return {
				routeKind: "native-equivalent",
				arguments: ["lint", ...tokens.slice(1)],
			};
		case "format":
			return {
				routeKind: "native-equivalent",
				arguments: ["format", ...tokens.slice(1)],
			};
		case "package-manager":
			return packageManagerRouteArguments(tokens);
		case "curl":
			return {
				routeKind: "native-equivalent",
				arguments: ["curl", ...tokens.slice(1)],
			};
		default:
			return proxyRouteArguments(originalCommand, tokens);
	}
}

function readRouteArguments(tokens: string[]): {
	routeKind: RtkRouteKind;
	arguments: string[];
} {
	const executable = executableName(tokens[0] ?? "");
	switch (executable) {
		case "cat":
		case "less":
			return {
				routeKind: "native-equivalent",
				arguments: ["read", ...tokens.slice(1)],
			};
		case "head":
		case "tail":
			return {
				routeKind: "proxy-pass-through",
				arguments: ["proxy", "--", ...tokens],
			};
		default:
			return {
				routeKind: "proxy-pass-through",
				arguments: ["proxy", "--", ...tokens],
			};
	}
}

function packageManagerRouteArguments(tokens: string[]): {
	routeKind: RtkRouteKind;
	arguments: string[];
} {
	const executable = executableName(tokens[0] ?? "");
	switch (executable) {
		case "npm":
		case "npx":
		case "pnpm":
			return {
				routeKind: "native-equivalent",
				arguments: [executable, ...tokens.slice(1)],
			};
		default:
			return {
				routeKind: "proxy-pass-through",
				arguments: ["proxy", "--", ...tokens],
			};
	}
}

function proxyRouteArguments(
	originalCommand: string,
	tokens: string[],
): { routeKind: RtkRouteKind; arguments: string[] } {
	return {
		routeKind: "proxy-pass-through",
		arguments:
			SHELL_OPERATOR_PATTERN.test(originalCommand) ||
			tokens.some((token) => ENV_ASSIGNMENT_PATTERN.test(token))
				? ["proxy", "--", "/bin/sh", "-lc", originalCommand]
				: ["proxy", "--", ...tokens],
	};
}

function commandTokens(command: string): string[] {
	const tokens = command.match(COMMAND_TOKEN_PATTERN) ?? [];
	return tokens.map((token) => token.replace(QUOTED_TOKEN_PATTERN, "$2"));
}

function stripEnvironmentAssignments(tokens: string[]): string[] {
	const firstCommand = tokens.findIndex(
		(token) => !ENV_ASSIGNMENT_PATTERN.test(token),
	);
	return firstCommand < 0 ? [] : tokens.slice(firstCommand);
}

function executableName(input: string): string {
	return path.basename(input);
}

function findRtkOnPath(pathValue: string): string | null {
	for (const directory of pathValue.split(path.delimiter)) {
		if (directory.length === 0) continue;
		for (const binary of RTK_BINARY_NAMES) {
			const candidate = path.join(directory, binary);
			if (isExecutableFile(candidate)) return candidate;
		}
	}
	return null;
}

function isExecutableFile(candidate: string): boolean {
	try {
		const stat = statSync(candidate);
		return stat.isFile() && (stat.mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

function missingExecutableFromEmptyRoute(
	route: RtkCommandRoute,
): RtkRouteBlocker {
	return {
		code: "RTK_EXECUTABLE_NOT_FOUND",
		originalCommand: route.originalCommand,
		requiredRtkRoute: route.rtkCommandText,
		written: [],
	};
}
