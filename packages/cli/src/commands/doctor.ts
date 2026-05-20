import type { ExitCode } from "lifecycle";
import {
	asJson,
	buildStatusReport,
	getOlympiCatalog,
	validateOlympiCatalog,
} from "reporting";
import { hookPolicyStatus } from "safety";
import { formatSetupStatus, readSetupStatus } from "../setup-status.js";

export interface DoctorCheck {
	name: string;
	ok: boolean;
	detail: string;
}

export interface DoctorReport {
	schemaVersion: 1;
	command: "doctor";
	projectRoot: string;
	mutationPolicy: "read-only";
	checks: DoctorCheck[];
	setup: Awaited<ReturnType<typeof readSetupStatus>>;
	status: Awaited<ReturnType<typeof buildStatusReport>>;
	hooks: ReturnType<typeof hookPolicyStatus>;
	catalogErrors: string[];
	ok: boolean;
	nextActions: string[];
}

export async function runDoctor(json: boolean): Promise<ExitCode> {
	const report = await buildDoctorReport();
	process.stdout.write(json ? asJson(report) : formatDoctorReport(report));
	return report.ok ? 0 : 1;
}

export async function buildDoctorReport(
	projectRoot: string = process.cwd(),
): Promise<DoctorReport> {
	const setup = await readSetupStatus(projectRoot);
	const status = await buildStatusReport();
	const hooks = hookPolicyStatus();
	const catalogErrors = validateOlympiCatalog(getOlympiCatalog());
	const checks: DoctorCheck[] = [
		{
			name: "Bun runtime",
			ok: toolAvailable(setup, "bun"),
			detail: toolDetail(setup, "bun"),
		},
		{
			name: "Pi host availability",
			ok: toolAvailable(setup, "pi"),
			detail: toolDetail(setup, "pi"),
		},
		{
			name: "RTK routing availability",
			ok: setup.rtk.status === "available",
			detail:
				setup.rtk.degradedReason ??
				`RTK available at ${setup.rtk.path ?? "PATH"}`,
		},
		{
			name: "Project-local Pi registration",
			ok: setup.configured.projectPiPresent,
			detail: setup.configured.projectPiPresent
				? ".pi present; project-local registration path is available"
				: ".pi absent; run olympi install --dry-run then olympi install --apply",
		},
		{
			name: "Olympi project state",
			ok: setup.configured.olympiStatePresent || status.warnings.length === 0,
			detail: `.pi/olympi ${setup.configured.olympiStatePresent ? "present" : "absent"}; warnings=${status.warnings.length}`,
		},
		{
			name: "Hook policy",
			ok: hooks.status === "ready-non-executing",
			detail: `${hooks.status}; ${hooks.warnings.join("; ") || "no warnings"}`,
		},
		{
			name: "Catalog contract",
			ok: catalogErrors.length === 0,
			detail:
				catalogErrors.length === 0
					? "implemented command/resource contracts validate"
					: catalogErrors.join("; "),
		},
	];
	return {
		schemaVersion: 1,
		command: "doctor",
		projectRoot: setup.projectRoot,
		mutationPolicy: "read-only",
		checks,
		setup,
		status,
		hooks,
		catalogErrors,
		ok: checks.every((check) => check.ok),
		nextActions: setup.nextActions,
	};
}

export function formatDoctorReport(report: DoctorReport): string {
	const lines = [
		`Olympi doctor: ${report.ok ? "ok" : "attention required"}`,
		`Project: ${report.projectRoot}`,
		"Mutation policy: read-only",
	];
	for (const check of report.checks) {
		lines.push(`${check.ok ? "ok" : "fail"}: ${check.name} — ${check.detail}`);
	}
	lines.push("", "Setup detail:", formatSetupStatus(report.setup).trimEnd());
	lines.push("Next actions:");
	for (const action of report.nextActions) lines.push(`- ${action}`);
	return `${lines.join("\n")}\n`;
}

function toolAvailable(
	setup: Awaited<ReturnType<typeof readSetupStatus>>,
	name: "bun" | "pi" | "rtk",
): boolean {
	return setup.tools.some((tool) => tool.name === name && tool.available);
}

function toolDetail(
	setup: Awaited<ReturnType<typeof readSetupStatus>>,
	name: "bun" | "pi" | "rtk",
): string {
	const tool = setup.tools.find((candidate) => candidate.name === name);
	if (tool === undefined) return `${name} was not checked`;
	return `${tool.available ? "available" : "missing"}${tool.path === null ? "" : ` at ${tool.path}`}; ${tool.detection}`;
}
