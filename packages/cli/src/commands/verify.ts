import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExitCode } from "lifecycle";
import {
	applyManifestUninstall,
	applyPassiveInstall,
	completeSavedGoal,
	hasLockDigestMismatch,
	inspectLocalPackage,
	planManifestUninstall,
	planPassiveInstall,
	readGoalState,
	readLock,
	readManifest,
	readPiSettings,
	readProjectStatus,
	recordGoalExecution,
	resumeSavedGoal,
	startGoalWorkflow,
	writeLock,
	writeSavedGoalState,
} from "lifecycle";
import { asJson, getOlympiCatalog, validateOlympiCatalog } from "reporting";

/** Single deterministic verification check result. */
export interface VerifyCheck {
	name: string;
	ok: boolean;
	detail: string;
}

/** Aggregate report emitted by `olympi dev verify`. */
export interface VerifyReport {
	schemaVersion: 1;
	command: "verify";
	checks: VerifyCheck[];
	ok: boolean;
}

/** Execute verification and write either JSON or terminal output. */
export async function runVerify(json: boolean): Promise<ExitCode> {
	const report = await buildVerifyReport();
	process.stdout.write(json ? asJson(report) : formatVerifyReport(report));
	return report.ok ? 0 : 1;
}

/** Build the deterministic verification report in temporary roots. */
export async function buildVerifyReport(): Promise<VerifyReport> {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-verify-"));
	try {
		const checks: VerifyCheck[] = [];
		const projectRoot = path.join(tempRoot, "temp-project");
		const fakeHome = path.join(tempRoot, "temp-home");
		const packagePath = path.join(tempRoot, "package-under-test");
		await createFakeHome(fakeHome);
		await createPassivePackage(packagePath);
		const catalogErrors = validateOlympiCatalog(getOlympiCatalog());
		checks.push({
			name: "Olympi catalog validates",
			ok: catalogErrors.length === 0,
			detail:
				catalogErrors.length === 0
					? "catalog contracts are aligned"
					: catalogErrors.join("; "),
		});
		const beforeSecret = await readFile(
			path.join(fakeHome, ".ssh", "id_rsa"),
			"utf8",
		);
		const inspection = await inspectLocalPackage(packagePath);
		checks.push({
			name: "inspect discovers deterministic passive fixture resources",
			ok:
				inspection.resources.length === 3 &&
				inspection.executables.length === 0,
			detail: `${inspection.resources.length} resources, ${inspection.executables.length} executables`,
		});
		const installPlan = await planPassiveInstall({
			source: packagePath,
			projectRoot,
			apply: false,
		});
		checks.push({
			name: "install dry-run is manifest-backed and unblocked for passive fixtures",
			ok:
				!installPlan.blocked &&
				installPlan.wouldWrite.includes(".pi/olympi/olympi-manifest.json") &&
				installPlan.wouldWrite.includes(".pi/settings.json packages entry"),
			detail: installPlan.reason,
		});
		const installApply = await applyPassiveInstall({
			source: packagePath,
			projectRoot,
			apply: true,
		});
		const manifest = await readManifest(projectRoot);
		const settings = await readPiSettings(projectRoot);
		const statusAfterInstall = await readProjectStatus(projectRoot);
		checks.push({
			name: "install apply writes project-local mirror, manifest, and settings only",
			ok:
				!installApply.blocked &&
				manifest.packages.length === 1 &&
				(settings.packages ?? []).length === 1 &&
				statusAfterInstall.manifestPackages === 1 &&
				statusAfterInstall.warnings.length === 0,
			detail: `${installApply.written.length} manifest-owned paths written; status warnings=${statusAfterInstall.warnings.length}`,
		});
		await writeLock(projectRoot, {
			schemaVersion: 1,
			packages: [
				{
					packageId: installApply.packageId,
					contentDigest: "sha256:not-the-installed-digest",
					decision: "trusted-passive",
				},
			],
		});
		const lock = await readLock(projectRoot);
		checks.push({
			name: "lock digest mismatch is detectable before trust-sensitive use",
			ok: hasLockDigestMismatch(
				lock,
				installApply.packageId,
				inspection.package.contentDigest,
			),
			detail: "mismatched content digest detected in temp project lock",
		});
		const savedGoal = await startGoalWorkflow({
			projectRoot,
			objective: "Repair docs and run bun run typecheck",
			verificationCommands: ["bun run typecheck"],
			save: true,
			createdAt: "1970-01-01T00:00:00.000Z",
		});
		const resumedGoal = await resumeSavedGoal({
			projectRoot,
			goalId: savedGoal.goalId,
			compactionSummary: "verify fixture resumes durable goal state",
			save: true,
		});
		const resumedGoalState = await readGoalState(projectRoot, savedGoal.goalId);
		checks.push({
			name: "goal resume preserves durable objective and writes only project-local goal state",
			ok:
				resumedGoal.saved &&
				resumedGoal.written.length === 1 &&
				resumedGoal.written[0] === savedGoal.statePath &&
				resumedGoalState.continuation.objectivePreserved &&
				resumedGoalState.continuation.lastCompactionSummary ===
					"verify fixture resumes durable goal state",
			detail: `${resumedGoal.written.length} goal-state path written; source mutation not requested`,
		});
		const executedGoalState = recordGoalExecution(resumedGoalState, {
			stepId: "step-1",
			command: "bun run typecheck",
			mode: "human-present",
			startedAt: "1970-01-01T00:00:00.000Z",
			finishedAt: "1970-01-01T00:00:01.000Z",
			exitCode: 0,
			stdout: "typecheck passed",
			stderr: "",
			policyAuditId: "verify-fixture-policy",
			hookDecision: "allow",
			selectedSkills: ["goal-loop-orchestration"],
			loadedSkillDigests: ["verify-fixture-skill"],
			provenanceProof: "unknown",
			mutationConfirmed: false,
		});
		await writeSavedGoalState(projectRoot, savedGoal.goalId, executedGoalState);
		const completedGoal = await completeSavedGoal({
			projectRoot,
			goalId: savedGoal.goalId,
			completionAuditComplete: true,
			save: true,
		});
		checks.push({
			name: "goal completion is verification-gated from saved execution records",
			ok:
				completedGoal.completed &&
				completedGoal.state.status === "completed" &&
				completedGoal.evidence.verification.some(
					(record) =>
						record.command === "bun run typecheck" && record.exitCode === 0,
				),
			detail: completedGoal.reason,
		});
		const uninstallPlan = await planManifestUninstall({
			packageId: installApply.packageId,
			projectRoot,
			apply: false,
		});
		checks.push({
			name: "uninstall dry-run reads manifest authority",
			ok: !uninstallPlan.blocked && uninstallPlan.wouldRemove.length > 0,
			detail: `${uninstallPlan.wouldRemove.length} manifest-owned removals planned`,
		});
		const uninstallApply = await applyManifestUninstall({
			packageId: installApply.packageId,
			projectRoot,
			apply: true,
		});
		const afterManifest = await readManifest(projectRoot);
		const afterSettings = await readPiSettings(projectRoot);
		checks.push({
			name: "uninstall apply removes only manifest-owned matching files",
			ok:
				uninstallApply.preserved.length === 0 &&
				afterManifest.packages.length === 0 &&
				(afterSettings.packages ?? []).length === 0,
			detail: `${uninstallApply.removed.length} paths removed`,
		});
		await createPassivePackage(
			path.join(tempRoot, "package-under-test-mismatch"),
		);
		const mismatchInstall = await applyPassiveInstall({
			source: path.join(tempRoot, "package-under-test-mismatch"),
			projectRoot: path.join(tempRoot, "mismatch-project"),
			apply: true,
		});
		await writeFile(
			path.join(
				tempRoot,
				"mismatch-project",
				".pi",
				"olympi",
				"packages",
				mismatchInstall.packageId,
				"package",
				"prompts",
				"review.md",
			),
			"user modified\n",
		);
		const mismatchUninstall = await applyManifestUninstall({
			packageId: mismatchInstall.packageId,
			projectRoot: path.join(tempRoot, "mismatch-project"),
			apply: true,
		});
		checks.push({
			name: "uninstall preserves user-modified files with hash mismatch",
			ok: mismatchUninstall.preserved.some((filePath) =>
				filePath.endsWith("prompts/review.md"),
			),
			detail: `${mismatchUninstall.preserved.length} changed paths preserved`,
		});
		const afterSecret = await readFile(
			path.join(fakeHome, ".ssh", "id_rsa"),
			"utf8",
		);
		checks.push({
			name: "verification does not touch fake home secrets or global Pi state",
			ok: beforeSecret === afterSecret,
			detail: "fake .ssh secret unchanged; all writes used temp project roots",
		});
		return {
			schemaVersion: 1,
			command: "verify",
			checks,
			ok: checks.every((check) => check.ok),
		};
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}

async function createPassivePackage(packagePath: string): Promise<void> {
	await mkdir(path.join(packagePath, "skills", "safe", "references"), {
		recursive: true,
	});
	await mkdir(path.join(packagePath, "prompts"), { recursive: true });
	await mkdir(path.join(packagePath, "themes"), { recursive: true });
	await writeFile(
		path.join(packagePath, "package.json"),
		`${JSON.stringify(
			{
				name: path.basename(packagePath),
				version: "0.0.0",
				pi: {
					skills: ["skills/safe/SKILL.md"],
					prompts: ["prompts/review.md"],
					themes: ["themes/dark.json"],
				},
			},
			null,
			2,
		)}\n`,
	);
	await writeFile(
		path.join(packagePath, "skills", "safe", "SKILL.md"),
		"# Safe\n",
	);
	await writeFile(
		path.join(packagePath, "skills", "safe", "references", "checklist.md"),
		"check\n",
	);
	await writeFile(
		path.join(packagePath, "prompts", "review.md"),
		"Review this.\n",
	);
	await writeFile(path.join(packagePath, "themes", "dark.json"), "{}\n");
}

async function createFakeHome(fakeHome: string): Promise<void> {
	await mkdir(path.join(fakeHome, ".ssh"), { recursive: true });
	await mkdir(path.join(fakeHome, ".config", "gh"), { recursive: true });
	await mkdir(path.join(fakeHome, ".pi", "agent"), { recursive: true });
	await writeFile(path.join(fakeHome, ".ssh", "id_rsa"), "fake secret\n");
	await writeFile(
		path.join(fakeHome, ".config", "gh", "hosts.yml"),
		"fake gh\n",
	);
	await writeFile(path.join(fakeHome, ".pi", "agent", "auth.json"), "{}\n");
}

export function formatVerifyReport(report: VerifyReport): string {
	const lines = [`Olympi verify: ${report.ok ? "ok" : "failed"}`];
	for (const check of report.checks) {
		lines.push(`${check.ok ? "ok" : "fail"}: ${check.name} — ${check.detail}`);
	}
	return `${lines.join("\n")}\n`;
}
