#!/usr/bin/env bun
import { hasErrors } from "@openagentlayer/diagnostics";
import {
	applyInstallPlan,
	uninstallManagedFiles,
	verifyManagedInstall,
} from "@openagentlayer/install";
import {
	applyWritePlan,
	createWritePlan,
	serializeWritePlan,
} from "@openagentlayer/render";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import type { Diagnostic, Surface } from "@openagentlayer/types";
import { SURFACES } from "@openagentlayer/types/constants";

type SurfaceOption = Surface | "all";
type ScopeOption = "project" | "global";

interface CliOptions {
	readonly root: string;
	readonly out: string | undefined;
	readonly dryRun: boolean;
	readonly surface: SurfaceOption | undefined;
	readonly scope: ScopeOption | undefined;
	readonly target: string | undefined;
}

const COMMANDS = new Set([
	"check",
	"render",
	"install",
	"uninstall",
	"doctor",
	"help",
]);

async function main(args: readonly string[]): Promise<number> {
	const [command = "help", ...rest] = args;
	if (!COMMANDS.has(command)) {
		printError(`Unknown command '${command}'.`);
		printHelp();
		return 2;
	}

	const options = parseOptions(rest);
	switch (command) {
		case "check":
			return await checkCommand(options);
		case "render":
			return await renderCommand(options);
		case "doctor":
			return await doctorCommand(options);
		case "install":
			return await installCommand(options);
		case "uninstall":
			return await uninstallCommand(options);
		case "help":
			printHelp();
			return 0;
		default:
			return 2;
	}
}

async function checkCommand(options: CliOptions): Promise<number> {
	const result = await loadSourceGraph(options.root);
	printDiagnostics(result.diagnostics);
	if (hasErrors(result.diagnostics) || result.graph === undefined) {
		return 1;
	}

	console.log(`oal check ok: ${result.graph.records.length} source records`);
	return 0;
}

async function renderCommand(options: CliOptions): Promise<number> {
	if (options.out === undefined) {
		printError("Missing required --out <dir>.");
		return 2;
	}

	const result = await loadSourceGraph(options.root);
	printDiagnostics(result.diagnostics);
	if (hasErrors(result.diagnostics) || result.graph === undefined) {
		return 1;
	}

	const plan = await createWritePlan(result.graph, options.out);
	printDiagnostics(plan.diagnostics);
	if (hasErrors(plan.diagnostics)) {
		return 1;
	}
	process.stdout.write(serializeWritePlan(plan));
	if (!options.dryRun) {
		await applyWritePlan(plan);
	}
	return 0;
}

async function doctorCommand(options: CliOptions): Promise<number> {
	const loadResult = await loadSourceGraph(options.root);
	printDiagnostics(loadResult.diagnostics);
	if (hasErrors(loadResult.diagnostics) || loadResult.graph === undefined) {
		return 1;
	}

	const graph = loadResult.graph;
	const registry = createAdapterRegistry();
	const bundles = resolveSurfaces(options.surface ?? "all").map((surface) =>
		registry.renderSurfaceBundle(graph, surface),
	);
	const diagnostics = bundles.flatMap((bundle) => bundle.diagnostics);
	printDiagnostics(diagnostics);
	if (hasErrors(diagnostics)) {
		return 1;
	}

	const hookIssues = await verifyRenderedHooks(bundles);
	for (const issue of hookIssues) {
		console.error(`ERROR hook-self-contained: ${issue}`);
	}
	if (hookIssues.length > 0) {
		return 1;
	}

	if (options.scope !== undefined || options.target !== undefined) {
		if (options.surface === undefined) {
			printError("Install verification requires --surface <surface|all>.");
			return 2;
		}
		if (options.scope === undefined) {
			printError("Install verification requires --scope <project|global>.");
			return 2;
		}
		const targetRoot = resolveTargetRoot({
			...options,
			scope: options.scope,
		});
		for (const surface of resolveSurfaces(options.surface)) {
			const result = await verifyManagedInstall({
				scope: options.scope,
				surface,
				targetRoot,
			});
			for (const issue of result.issues) {
				console.error(
					`ERROR install-verify/${issue.code}: ${issue.path}: ${issue.message}`,
				);
			}
			if (result.issues.length > 0) {
				return 1;
			}
			console.log(`oal doctor install ${surface}/${options.scope} ok`);
		}
	}

	console.log(`oal doctor root=${options.root}`);
	console.log(`bun=${Bun.version}`);
	console.log(`oal doctor ok: ${bundles.length} surface bundles verified`);
	return 0;
}

async function installCommand(options: CliOptions): Promise<number> {
	if (!hasInstallOptions(options)) {
		return 2;
	}

	const loadResult = await loadSourceGraph(options.root);
	printDiagnostics(loadResult.diagnostics);
	if (hasErrors(loadResult.diagnostics) || loadResult.graph === undefined) {
		return 1;
	}

	const graph = loadResult.graph;
	const registry = createAdapterRegistry();
	const targetRoot = resolveTargetRoot(options);
	const bundles = resolveSurfaces(options.surface).map((surface) =>
		registry.renderSurfaceBundle(graph, surface),
	);
	const diagnostics = bundles.flatMap((bundle) => bundle.diagnostics);
	printDiagnostics(diagnostics);
	if (hasErrors(diagnostics)) {
		return 1;
	}

	for (const bundle of bundles) {
		const result = await applyInstallPlan({
			bundle,
			scope: options.scope,
			targetRoot,
		});
		console.log(
			`oal install ${bundle.surface}/${options.scope}: ${result.writtenFiles.length} files`,
		);
	}
	return 0;
}

async function uninstallCommand(options: CliOptions): Promise<number> {
	if (!hasInstallOptions(options)) {
		return 2;
	}

	const targetRoot = resolveTargetRoot(options);
	for (const surface of resolveSurfaces(options.surface)) {
		const result = await uninstallManagedFiles({
			scope: options.scope,
			surface,
			targetRoot,
		});
		console.log(
			`oal uninstall ${surface}/${options.scope}: ${result.removedFiles.length} files`,
		);
	}
	return 0;
}

function parseOptions(args: readonly string[]): CliOptions {
	let root = process.cwd();
	let out: string | undefined;
	let dryRun = false;
	let surface: SurfaceOption | undefined;
	let scope: ScopeOption | undefined;
	let target: string | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		switch (arg) {
			case "--root":
				root = readOptionValue(args, index, "--root");
				index += 1;
				break;
			case "--out":
				out = readOptionValue(args, index, "--out");
				index += 1;
				break;
			case "--dry-run":
				dryRun = true;
				break;
			case "--surface":
				surface = readSurfaceOption(args, index);
				index += 1;
				break;
			case "--scope":
				scope = readScopeOption(args, index);
				index += 1;
				break;
			case "--target":
				target = readOptionValue(args, index, "--target");
				index += 1;
				break;
			default:
				throw new Error(`Unknown option '${arg}'.`);
		}
	}

	return { root, out, dryRun, surface, scope, target };
}

function readOptionValue(
	args: readonly string[],
	index: number,
	option: string,
): string {
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new Error(`Missing value for ${option}.`);
	}
	return value;
}

function readSurfaceOption(
	args: readonly string[],
	index: number,
): SurfaceOption {
	const value = readOptionValue(args, index, "--surface");
	if (value === "all" || SURFACES.includes(value as Surface)) {
		return value as SurfaceOption;
	}
	throw new Error(`Invalid --surface '${value}'.`);
}

function readScopeOption(args: readonly string[], index: number): ScopeOption {
	const value = readOptionValue(args, index, "--scope");
	if (value === "project" || value === "global") {
		return value;
	}
	throw new Error(`Invalid --scope '${value}'.`);
}

function hasInstallOptions(options: CliOptions): options is CliOptions & {
	readonly surface: SurfaceOption;
	readonly scope: ScopeOption;
} {
	if (options.surface === undefined) {
		printError("Missing required --surface <codex|claude|opencode|all>.");
		return false;
	}
	if (options.scope === undefined) {
		printError("Missing required --scope <project|global>.");
		return false;
	}
	if (options.scope === "global" && options.target === undefined) {
		printError("Global install requires explicit --target <dir>.");
		return false;
	}
	return true;
}

function resolveTargetRoot(
	options: CliOptions & { readonly scope: ScopeOption },
): string {
	if (options.target !== undefined) {
		return options.target;
	}
	return options.root;
}

function resolveSurfaces(surface: SurfaceOption): readonly Surface[] {
	return surface === "all" ? SURFACES : [surface];
}

function printDiagnostics(diagnostics: readonly Diagnostic[]): void {
	for (const diagnostic of diagnostics) {
		const path = diagnostic.path === undefined ? "" : `${diagnostic.path}: `;
		const output = `${diagnostic.level.toUpperCase()} ${diagnostic.code}: ${path}${diagnostic.message}`;
		if (diagnostic.level === "error") {
			console.error(output);
		} else {
			console.warn(output);
		}
	}
}

function printHelp(): void {
	console.log(
		"Usage: oal <check|render|install|uninstall|doctor> [--root <dir>] [--out <dir>] [--surface <surface|all>] [--scope <project|global>] [--target <dir>] [--dry-run]",
	);
}

function printError(message: string): void {
	console.error(`ERROR: ${message}`);
}

async function verifyRenderedHooks(
	bundles: readonly {
		readonly artifacts: readonly {
			readonly content: string;
			readonly kind: string;
			readonly path: string;
		}[];
	}[],
): Promise<readonly string[]> {
	const issues: string[] = [];
	for (const bundle of bundles) {
		for (const artifact of bundle.artifacts) {
			if (artifact.kind !== "hook" || !artifact.path.endsWith(".mjs")) {
				continue;
			}
			const process = Bun.spawn(["bun", "-e", artifact.content], {
				stderr: "pipe",
				stdin: "pipe",
				stdout: "pipe",
			});
			process.stdin.write("{}");
			process.stdin.end();
			const [stdout, stderr] = await Promise.all([
				new Response(process.stdout).text(),
				new Response(process.stderr).text(),
				process.exited,
			]);
			try {
				const decision = JSON.parse(stdout) as { readonly decision?: unknown };
				if (typeof decision.decision === "string") {
					continue;
				}
			} catch {
				// Report below.
			}
			issues.push(`${artifact.path}: ${stderr || stdout}`);
		}
	}
	return issues;
}

const exitCode = await main(Bun.argv.slice(2)).catch((error: unknown) => {
	printError(error instanceof Error ? error.message : String(error));
	return 2;
});

process.exit(exitCode);
