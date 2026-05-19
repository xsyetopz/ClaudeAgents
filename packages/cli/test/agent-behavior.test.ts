import { describe, expect, test } from "bun:test";
import {
	buildOperationalFailureReport,
	reviewDocumentationQuality,
	validateOperationalFailureText,
} from "reporting";

describe("Olympi agent behavior reporting", () => {
	test("failure report requires operational fields", () => {
		const report = buildOperationalFailureReport({
			failure: "Attempted restore of ambiguous .pi/settings.json was blocked.",
			impact: "Config repair cannot proceed without ownership authority.",
			change: "No workspace file was reverted or staged.",
			verification:
				"Blocked before command execution; next best check is git status --short.",
			remainingBlocker:
				"Need manifest hash, provenance record, same-run provenance, or explicit user approval.",
		});

		expect(report.valid).toBe(true);
		expect(Object.keys(report.fields).sort()).toEqual(
			[
				"Change",
				"Failure",
				"Impact",
				"Remaining blocker",
				"Verification",
			].sort(),
		);
	});

	test("apology text is allowed only with required fields and no deferred remediation", () => {
		const valid = validateOperationalFailureText(`Sorry for the bad command.
Failure: Used a restore-like command on an ambiguous file.
Impact: User-owned settings could have been overwritten.
Change: Added ownership proof gate and tests.
Verification: bun test packages/cli/test/agent-behavior.test.ts passed.
Remaining blocker: none.`);

		expect(valid.valid).toBe(true);

		const invalid = validateOperationalFailureText(`Sorry for the bad command.
Failure: Used a restore-like command on an ambiguous file.
Impact: User-owned settings could have been overwritten.
Change: No guardrail yet.
Verification: looks good.
Remaining blocker: none. If you want, I can fix it later.`);

		expect(invalid.valid).toBe(false);
		expect(invalid.reasons.join("\n")).toContain(
			"Remediation cannot be deferred",
		);
		expect(invalid.reasons.join("\n")).toContain("Verification must name");
	});

	test("documentation review catches hype through criteria and examples", () => {
		const slop = reviewDocumentationQuality(
			"A magical, game-changing experience that makes everything seamless.",
		);
		expect(slop.valid).toBe(false);
		expect(slop.findings.join("\n")).toContain("missing concrete command");
		expect(slop.findings.join("\n")).toContain("unsupported subjective claims");
		expect(slop.examplesChecked.length).toBeGreaterThan(0);

		const technical = reviewDocumentationQuality(
			"Run `bun run olympi:verify -- --json` after changes. Acceptance requires exit code 0 and no manifest-owned file drift.",
		);
		expect(technical.valid).toBe(true);
	});
});
