import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inspectLocalPackage } from "../inspection";
import { asJson } from "../report";
import type { ExitCode } from "../types";

interface VerifyCheck {
	name: string;
	ok: boolean;
	detail: string;
}

interface VerifyReport {
	schemaVersion: 1;
	command: "verify";
	checks: VerifyCheck[];
	ok: boolean;
}

export async function runVerify(json: boolean): Promise<ExitCode> {
	const report = await verifyInspectableFixture();
	process.stdout.write(json ? asJson(report) : formatVerify(report));
	return report.ok ? 0 : 1;
}

async function verifyInspectableFixture(): Promise<VerifyReport> {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympus-verify-"));
	try {
		const packagePath = path.join(tempRoot, "package-under-test");
		await mkdir(path.join(packagePath, "skills", "safe"), { recursive: true });
		await mkdir(path.join(packagePath, "prompts"), { recursive: true });
		await mkdir(path.join(packagePath, "themes"), { recursive: true });
		await writeFile(
			path.join(packagePath, "package.json"),
			JSON.stringify({ name: "verify-fixture", version: "0.0.0" }),
		);
		await writeFile(
			path.join(packagePath, "skills", "safe", "SKILL.md"),
			"# Safe\n",
		);
		await writeFile(
			path.join(packagePath, "prompts", "review.md"),
			"Review this.\n",
		);
		await writeFile(path.join(packagePath, "themes", "dark.json"), "{}\n");
		const fakeHomeMarker = path.join(
			tempRoot,
			"fake-home",
			".pi",
			"should-not-exist.json",
		);
		const before = await readOptional(fakeHomeMarker);
		const report = await inspectLocalPackage(packagePath);
		const after = await readOptional(fakeHomeMarker);
		const checks: VerifyCheck[] = [
			{
				name: "inspect discovers passive resources",
				ok: report.resources.length === 3 && report.executables.length === 0,
				detail: `${report.resources.length} resources, ${report.executables.length} executables`,
			},
			{
				name: "inspect does not write fake home",
				ok: before === after && after === undefined,
				detail: "fake home marker remains absent",
			},
		];
		await writeFile(
			path.join(tempRoot, "verification-ran-inside-temp-root"),
			"ok\n",
		);
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

async function readOptional(filePath: string): Promise<string | undefined> {
	try {
		return await readFile(filePath, "utf8");
	} catch {
		return undefined;
	}
}

function formatVerify(report: VerifyReport): string {
	const lines = [`Olympus verify: ${report.ok ? "ok" : "failed"}`];
	for (const check of report.checks) {
		lines.push(`${check.ok ? "ok" : "fail"}: ${check.name} — ${check.detail}`);
	}
	return `${lines.join("\n")}\n`;
}
