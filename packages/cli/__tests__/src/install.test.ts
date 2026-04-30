import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { runCli } from "../_helpers/cli";

describe("OAL CLI install flows", () => {
	test("surface all project install and uninstall manage three manifests", async () => {
		const targetRoot = await createFixtureRoot();

		const installResult = await runCli([
			"install",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(installResult.exitCode).toBe(0);
		for (const surface of ["codex", "claude", "opencode"]) {
			expect(
				await Bun.file(
					join(targetRoot, `.oal/manifest/${surface}-project.json`),
				).exists(),
			).toBe(true);
		}

		const uninstallResult = await runCli([
			"uninstall",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(uninstallResult.exitCode).toBe(0);
		for (const surface of ["codex", "claude", "opencode"]) {
			expect(
				await Bun.file(
					join(targetRoot, `.oal/manifest/${surface}-project.json`),
				).exists(),
			).toBe(false);
		}
	});

	test("doctor verifies installed managed files", async () => {
		const targetRoot = await createFixtureRoot();
		const installResult = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);
		expect(installResult.exitCode).toBe(0);

		const doctorResult = await runCli([
			"doctor",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(doctorResult.exitCode).toBe(0);
		expect(doctorResult.stdout).toContain(
			"oal doctor install codex/project ok",
		);
	});

	test("doctor reports bad installed managed files", async () => {
		const targetRoot = await createFixtureRoot();
		const installResult = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);
		expect(installResult.exitCode).toBe(0);
		await writeFile(join(targetRoot, ".codex/config.toml"), "changed\n");

		const doctorResult = await runCli([
			"doctor",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(doctorResult.exitCode).toBe(1);
		expect(doctorResult.stderr).toContain("hash-mismatch");
	});

	test("global install requires explicit target", async () => {
		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"global",
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain(
			"Global install requires explicit --target",
		);
	});

	test("global install writes selected surface artifacts and manifest", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"global",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(0);
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-global.json"),
			).exists(),
		).toBe(true);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(true);
	});

	test("uninstall reports edited managed config and keeps manifest", async () => {
		const targetRoot = await createFixtureRoot();
		const installResult = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			process.cwd(),
		]);
		expect(installResult.exitCode).toBe(0);
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const uninstallResult = await runCli([
			"uninstall",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
		]);

		expect(uninstallResult.exitCode).toBe(1);
		expect(uninstallResult.stderr).toContain("managed-content-changed");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(true);
	});
});
