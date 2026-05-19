import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { type OlympiProjectStatus, readProjectStatus } from "lifecycle";
import { detectRtk, type RtkStatusReport } from "reporting";

const EXECUTABLE_NAMES = {
	bun: ["bun"],
	pi: ["pi", "pi-coding-agent"],
};

export interface ToolStatus {
	name: "bun" | "pi" | "rtk";
	available: boolean;
	path: string | null;
	version: string | null;
	detection: string;
}

export interface SetupStatusReport {
	schemaVersion: 1;
	command: "setup status";
	projectRoot: string;
	mutationPolicy: "read-only";
	tools: ToolStatus[];
	paths: {
		projectPi: string;
		olympiState: string;
		settings: string;
		manifest: string;
		lock: string;
		audit: string;
		quota: string;
	};
	configured: {
		projectPiPresent: boolean;
		olympiStatePresent: boolean;
		settingsPresent: boolean;
		manifestPresent: boolean;
		lockPresent: boolean;
		auditPresent: boolean;
		quotaProfilePresent: boolean;
	};
	state: {
		manifestPackages: number;
		lockRecords: number;
		auditEvents: number;
		packageMirrors: number;
		driftWarnings: string[];
	};
	rtk: RtkStatusReport;
	warnings: string[];
	nextActions: string[];
}

export async function readSetupStatus(
	projectRoot: string = process.cwd(),
	env: NodeJS.ProcessEnv = process.env,
): Promise<SetupStatusReport> {
	const root = path.resolve(projectRoot);
	const status = await readProjectStatus(root);
	const paths = setupPaths(root);
	const rtk = detectRtk(env);
	const configured = {
		projectPiPresent: exists(paths.projectPi),
		olympiStatePresent: exists(paths.olympiState),
		settingsPresent: exists(paths.settings),
		manifestPresent: exists(paths.manifest),
		lockPresent: exists(paths.lock),
		auditPresent: exists(paths.audit),
		quotaProfilePresent: exists(paths.quota),
	};
	const warnings = buildWarnings(configured, status, rtk);
	return {
		schemaVersion: 1,
		command: "setup status",
		projectRoot: root,
		mutationPolicy: "read-only",
		tools: [detectTool("bun", env), detectTool("pi", env), rtkTool(rtk)],
		paths: {
			projectPi: ".pi",
			olympiState: ".pi/olympi",
			settings: ".pi/settings.json",
			manifest: ".pi/olympi/olympi-manifest.json",
			lock: ".pi/olympi/olympi.lock",
			audit: ".pi/olympi/audit.jsonl",
			quota: ".pi/olympi/quota/profile.json",
		},
		configured,
		state: {
			manifestPackages: status.manifestPackages,
			lockRecords: status.lockRecords,
			auditEvents: status.auditEvents,
			packageMirrors: status.packages.length,
			driftWarnings: status.warnings,
		},
		rtk,
		warnings,
		nextActions: buildNextActions(configured, status, rtk),
	};
}

export function formatSetupStatus(report: SetupStatusReport): string {
	const lines = [
		"Olympi setup status",
		`Project: ${report.projectRoot}`,
		"Mutation policy: read-only (no setup writes were performed)",
		"Tools:",
	];
	for (const tool of report.tools) {
		lines.push(
			`- ${tool.name}: ${tool.available ? "available" : "missing"}${tool.path === null ? "" : ` (${tool.path})`}`,
		);
		if (tool.version !== null) lines.push(`  version: ${tool.version}`);
		lines.push(`  detection: ${tool.detection}`);
	}
	lines.push("Project-local state:");
	lines.push(
		`- .pi: ${report.configured.projectPiPresent ? "present" : "absent"}`,
	);
	lines.push(
		`- .pi/olympi: ${report.configured.olympiStatePresent ? "present" : "absent"}`,
	);
	lines.push(
		`- manifest: ${report.configured.manifestPresent ? "present" : "absent"} (${report.state.manifestPackages} packages)`,
	);
	lines.push(
		`- lock: ${report.configured.lockPresent ? "present" : "absent"} (${report.state.lockRecords} records)`,
	);
	lines.push(
		`- audit: ${report.configured.auditPresent ? "present" : "absent"} (${report.state.auditEvents} events)`,
	);
	lines.push(
		`- quota profile: ${report.configured.quotaProfilePresent ? "present" : "absent"}`,
	);
	for (const warning of report.warnings) lines.push(`warning: ${warning}`);
	lines.push("Next actions:");
	for (const action of report.nextActions) lines.push(`- ${action}`);
	return `${lines.join("\n")}\n`;
}

interface SetupStatusPathsAbsolute {
	projectPi: string;
	olympiState: string;
	settings: string;
	manifest: string;
	lock: string;
	audit: string;
	quota: string;
}

function setupPaths(projectRoot: string): SetupStatusPathsAbsolute {
	return {
		projectPi: path.join(projectRoot, ".pi"),
		olympiState: path.join(projectRoot, ".pi", "olympi"),
		settings: path.join(projectRoot, ".pi", "settings.json"),
		manifest: path.join(projectRoot, ".pi", "olympi", "olympi-manifest.json"),
		lock: path.join(projectRoot, ".pi", "olympi", "olympi.lock"),
		audit: path.join(projectRoot, ".pi", "olympi", "audit.jsonl"),
		quota: path.join(projectRoot, ".pi", "olympi", "quota", "profile.json"),
	};
}

function detectTool(name: "bun" | "pi", env: NodeJS.ProcessEnv): ToolStatus {
	const found = findExecutable(env["PATH"] ?? "", EXECUTABLE_NAMES[name]);
	return {
		name,
		available: found !== null,
		path: found,
		version:
			name === "bun" && typeof Bun.version === "string" ? Bun.version : null,
		detection:
			name === "bun"
				? "current Bun runtime plus PATH scan; no external command executed"
				: "PATH scan only; no Pi command executed",
	};
}

function rtkTool(rtk: RtkStatusReport): ToolStatus {
	return {
		name: "rtk",
		available: rtk.status === "available",
		path: rtk.path,
		version: null,
		detection: "PATH scan only; RTK was not executed",
	};
}

function findExecutable(pathValue: string, names: string[]): string | null {
	for (const directory of pathValue.split(path.delimiter)) {
		if (directory.length === 0) continue;
		for (const name of names) {
			const candidate = path.join(directory, name);
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

function exists(filePath: string): boolean {
	return existsSync(filePath);
}

function buildWarnings(
	configured: SetupStatusReport["configured"],
	status: OlympiProjectStatus,
	rtk: RtkStatusReport,
): string[] {
	return [
		...(configured.projectPiPresent
			? []
			: ["project .pi directory is absent; install/apply remains explicit"]),
		...(configured.olympiStatePresent
			? []
			: ["project .pi/olympi state directory is absent"]),
		...(rtk.status === "unavailable" && rtk.degradedReason !== null
			? [rtk.degradedReason]
			: []),
		...status.warnings,
	];
}

function buildNextActions(
	configured: SetupStatusReport["configured"],
	status: OlympiProjectStatus,
	rtk: RtkStatusReport,
): string[] {
	const actions: string[] = [];
	if (!configured.projectPiPresent) {
		actions.push(
			"Run package inspect/evaluate first; use install --project --dry-run before any project-local apply.",
		);
	}
	if (status.warnings.length > 0) {
		actions.push("Review status drift before trust-sensitive operations.");
	}
	if (rtk.status === "unavailable") {
		actions.push("Expose RTK on PATH for preferred output-heavy compaction.");
	}
	if (actions.length === 0) {
		actions.push(
			"No setup action required; continue with project-local Olympi commands.",
		);
	}
	return actions.sort((left, right) => left.localeCompare(right));
}
