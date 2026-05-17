import type { Stats } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileExists, hashFile, toPosix } from "../hashing";
import { asJson } from "../report";
import { type ExitCode, OlympusError } from "../types";

interface ExtensionInspectReport {
	schemaVersion: 1;
	command: "extension inspect";
	path: string;
	entrypoints: Array<{ path: string; hash: string }>;
	decision: "inspect-only";
	warnings: string[];
}

interface ExtensionCreateReport {
	schemaVersion: 1;
	command: "extension create";
	name: string;
	apply: false;
	blocked: true;
	wouldWrite: string[];
	reason: string;
}

export function runExtension(
	args: string[],
	json: boolean,
): ExitCode | Promise<ExitCode> {
	const subcommand = args[0];
	if (subcommand === "inspect") return runExtensionInspect(args.slice(1), json);
	if (subcommand === "create") return runExtensionCreate(args.slice(1), json);
	throw new OlympusError("usage: olympus extension <inspect|create> ...", 2);
}

async function runExtensionInspect(
	args: string[],
	json: boolean,
): Promise<ExitCode> {
	const source = args[0];
	if (source === undefined)
		throw new OlympusError(
			"usage: olympus extension inspect <path> [--json]",
			2,
		);
	const sourcePath = path.resolve(source);
	const entrypoints = await resolveEntrypoints(sourcePath);
	const report: ExtensionInspectReport = {
		schemaVersion: 1,
		command: "extension inspect",
		path: sourcePath,
		entrypoints,
		decision: "inspect-only",
		warnings: entrypoints.length === 0 ? ["no extension entrypoint found"] : [],
	};
	process.stdout.write(json ? asJson(report) : formatExtensionInspect(report));
	return 0;
}

function runExtensionCreate(args: string[], json: boolean): ExitCode {
	const name = args.find((arg) => !arg.startsWith("--"));
	if (name === undefined)
		throw new OlympusError(
			"usage: olympus extension create <name> --dry-run [--json]",
			2,
		);
	if (!args.includes("--dry-run")) {
		throw new OlympusError(
			"extension create apply is deferred until the authoring phase; rerun with --dry-run",
			3,
		);
	}
	const report: ExtensionCreateReport = {
		schemaVersion: 1,
		command: "extension create",
		name,
		apply: false,
		blocked: true,
		wouldWrite: [
			`.pi/olympus/extensions/${name}/package.json`,
			`.pi/olympus/extensions/${name}/src/index.ts`,
			`.pi/olympus/extensions/${name}/README.md`,
			`.pi/olympus/extensions/${name}/olympus-extension.json`,
		],
		reason:
			"Phase 03 exposes the command boundary; first-party extension authoring is Phase 04 scope",
	};
	process.stdout.write(json ? asJson(report) : formatExtensionCreate(report));
	return 3;
}

async function resolveEntrypoints(
	sourcePath: string,
): Promise<Array<{ path: string; hash: string }>> {
	let sourceStat: Stats;
	try {
		sourceStat = await stat(sourcePath);
	} catch {
		throw new OlympusError(`extension path does not exist: ${sourcePath}`, 2);
	}
	if (sourceStat.isFile())
		return [{ path: sourcePath, hash: await hashFile(sourcePath) }];
	if (!sourceStat.isDirectory())
		throw new OlympusError(
			`extension path is not a file or directory: ${sourcePath}`,
			2,
		);
	const candidates = ["index.ts", "index.js", "src/index.ts", "src/index.js"];
	const entrypoints: Array<{ path: string; hash: string }> = [];
	for (const candidate of candidates) {
		const candidatePath = path.join(sourcePath, candidate);
		if (await fileExists(candidatePath)) {
			entrypoints.push({
				path: toPosix(path.relative(sourcePath, candidatePath)),
				hash: await hashFile(candidatePath),
			});
		}
	}
	return entrypoints;
}

function formatExtensionInspect(report: ExtensionInspectReport): string {
	const lines = [
		`Olympus extension inspection: ${report.path}`,
		`Entrypoints: ${report.entrypoints.length}`,
	];
	for (const entrypoint of report.entrypoints)
		lines.push(`- ${entrypoint.path} ${entrypoint.hash}`);
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	return `${lines.join("\n")}\n`;
}

function formatExtensionCreate(report: ExtensionCreateReport): string {
	const lines = [
		"Olympus extension create dry-run",
		`Name: ${report.name}`,
		`Reason: ${report.reason}`,
	];
	for (const writePath of report.wouldWrite)
		lines.push(`would write: ${writePath}`);
	return `${lines.join("\n")}\n`;
}
