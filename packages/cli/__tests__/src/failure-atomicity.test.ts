import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { runCli, writeSurfaceConfig } from "../_helpers/cli";

describe("OAL CLI failure atomicity", () => {
	test("render fails before writing when adapter diagnostics contain errors", async () => {
		const sourceRoot = await createFixtureRoot();
		const targetRoot = await createFixtureRoot();
		await writeSurfaceConfig(sourceRoot, "codex");
		await writeSurfaceConfig(sourceRoot, "claude");
		await writeSurfaceConfig(sourceRoot, "opencode", {
			blockedKeyPaths: ["plugin"],
			projectDefaults: [
				"[project_defaults]",
				'plugin = [".opencode/plugins/openagentlayer.ts"]',
			],
		});

		const result = await runCli([
			"render",
			"--out",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			false,
		);
	});

	test("install fails before writing when adapter diagnostics contain errors", async () => {
		const sourceRoot = await createFixtureRoot();
		const targetRoot = await createFixtureRoot();
		await writeSurfaceConfig(sourceRoot, "codex", {
			blockedKeyPaths: ["features.fast_mode"],
			projectDefaults: ["[project_defaults.features]", "fast_mode = false"],
		});
		await writeSurfaceConfig(sourceRoot, "claude");
		await writeSurfaceConfig(sourceRoot, "opencode");

		const result = await runCli([
			"install",
			"--surface",
			"codex",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
	});

	test("install reports config conflicts without partial writes", async () => {
		const targetRoot = await createFixtureRoot();
		await mkdir(join(targetRoot, ".codex"), { recursive: true });
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const result = await runCli([
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

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("config-conflict");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
	});

	test("surface all install fails atomically when one adapter has diagnostics", async () => {
		const sourceRoot = await createFixtureRoot();
		const targetRoot = await createFixtureRoot();
		await writeSurfaceConfig(sourceRoot, "codex");
		await writeSurfaceConfig(sourceRoot, "claude");
		await writeSurfaceConfig(sourceRoot, "opencode", {
			blockedKeyPaths: ["plugin"],
			projectDefaults: [
				"[project_defaults]",
				'plugin = [".opencode/plugins/openagentlayer.ts"]',
			],
		});

		const result = await runCli([
			"install",
			"--surface",
			"all",
			"--scope",
			"project",
			"--target",
			targetRoot,
			"--root",
			sourceRoot,
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("blocked-config-key");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
	});

	test("surface all install preflights config conflicts before writing", async () => {
		const targetRoot = await createFixtureRoot();
		await mkdir(join(targetRoot, ".claude"), { recursive: true });
		await writeFile(
			join(targetRoot, ".claude/settings.json"),
			'{"hooks":{"UserPromptSubmit":[]}}\n',
		);

		const result = await runCli([
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

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("config-conflict");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
	});
});
