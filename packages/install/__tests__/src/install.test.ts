import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyInstallPlan } from "@openagentlayer/install";
import { createInstallFixture } from "../_helpers/install";

describe("OAL installer writes", () => {
	test("project install writes selected surface artifacts and manifest", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();

		const result = await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});

		expect(result.manifest.surface).toBe("codex");
		expect(result.writtenFiles).toContain(
			join(targetRoot, ".oal/manifest/codex-project.json"),
		);
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).text(),
		).toContain("fast_mode = false");
		const codexConfig = await Bun.file(
			join(targetRoot, ".codex/config.toml"),
		).text();
		expect(() => Bun.TOML.parse(codexConfig)).not.toThrow();
	});

	test("install merges AGENTS.md without overwriting user content", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		const agentsPath = join(targetRoot, "AGENTS.md");
		await writeFile(agentsPath, "# User Instructions\n\nKeep this.\n");

		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});

		const installed = await Bun.file(agentsPath).text();
		expect(installed).toContain("# User Instructions");
		expect(installed).toContain("Keep this.");
		expect(installed).toContain(
			"BEGIN OPENAGENTLAYER:codex:codex-instructions",
		);
		expect(installed).toContain("OpenAgentLayer Codex Instructions");
	});

	test("install rejects preexisting user-owned config conflicts", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await mkdir(join(targetRoot, ".codex"), { recursive: true });
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		await expect(
			applyInstallPlan({
				bundle: codexBundle,
				scope: "project",
				targetRoot,
			}),
		).rejects.toThrow("config-conflict");
		expect(
			await Bun.file(
				join(targetRoot, ".oal/manifest/codex-project.json"),
			).exists(),
		).toBe(false);
		expect(await Bun.file(join(targetRoot, ".codex/config.toml")).text()).toBe(
			"[features]\nfast_mode = true\n",
		);
	});

	test("reinstall may update manifest-owned config keys", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		const changedBundle = {
			...codexBundle,
			artifacts: codexBundle.artifacts.map((artifact) =>
				artifact.path === ".codex/config.toml"
					? {
							...artifact,
							content: artifact.content.replace(
								"fast_mode = false",
								"fast_mode = true",
							),
						}
					: artifact,
			),
		};

		await applyInstallPlan({
			bundle: changedBundle,
			scope: "project",
			targetRoot,
		});

		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).text(),
		).toContain("fast_mode = true");
	});

	test("install rejects managed paths that escape target root", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();

		await expect(
			applyInstallPlan({
				bundle: {
					...codexBundle,
					artifacts: [
						{
							content: "bad\n",
							kind: "config",
							path: "../escape.txt",
							sourceRecordIds: [],
							surface: "codex",
						},
					],
				},
				scope: "project",
				targetRoot,
			}),
		).rejects.toThrow("escapes target root");
	});
});
