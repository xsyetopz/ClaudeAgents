import type { ExitCode } from "lifecycle";
import { asJson } from "reporting";
import { auditRecordFromDecision, decidePolicy } from "safety";

export interface SafetyCheckReport {
	schemaVersion: 1;
	command: "safety check";
	ok: boolean;
	checks: Array<{
		name: string;
		ok: boolean;
		decision: string;
		reasons: string[];
	}>;
	auditPreview: ReturnType<typeof auditRecordFromDecision>;
}

export function runSafety(args: string[], json: boolean): ExitCode {
	if (args[0] !== "check") return usage();
	const report = buildSafetyCheckReport();
	process.stdout.write(json ? asJson(report) : formatSafety(report));
	return report.ok ? 0 : 1;
}

export function buildSafetyCheckReport(): SafetyCheckReport {
	const unsafe = decidePolicy({
		schemaVersion: 1,
		eventType: "tool_call",
		toolName: "bash",
		operation: "execute",
		command: "rm -rf ~/.pi",
		path: "~/.pi/settings.json",
	});
	const redacted = decidePolicy({
		schemaVersion: 1,
		eventType: "tool_result",
		text: "api_key=sk-1234567890abcdef",
	});
	const provider = decidePolicy({
		schemaVersion: 1,
		eventType: "before_provider_request",
		payloadBytes: 150_000,
		quotaPressure: true,
	});
	const checks = [
		{
			name: "unsafe tool_call blocked",
			ok: unsafe.blocked,
			decision: unsafe.decision,
			reasons: unsafe.reasons,
		},
		{
			name: "secret output redacted",
			ok: redacted.redactions.length > 0,
			decision: redacted.decision,
			reasons: redacted.reasons,
		},
		{
			name: "provider payload warning/audit works",
			ok: provider.decision === "warn",
			decision: provider.decision,
			reasons: provider.reasons,
		},
	];
	return {
		schemaVersion: 1,
		command: "safety check",
		ok: checks.every((check) => check.ok),
		checks,
		auditPreview: auditRecordFromDecision(provider),
	};
}

function usage(): ExitCode {
	process.stderr.write("olympus: usage: olympus safety check [--json]\n");
	return 2;
}

function formatSafety(report: SafetyCheckReport): string {
	const lines = [`Olympus safety check: ${report.ok ? "ok" : "failed"}`];
	for (const check of report.checks) {
		lines.push(
			`${check.ok ? "ok" : "fail"}: ${check.name} (${check.decision})`,
		);
		for (const reason of check.reasons) lines.push(`  reason: ${reason}`);
	}
	return `${lines.join("\n")}\n`;
}
