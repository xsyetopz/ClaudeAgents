import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	applyInstallPlan,
	uninstallManagedFiles,
} from "@openagentlayer/install";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { createInstallFixture } from "../_helpers/install";

describe("OAL installer uninstall", () => {
	test("uninstall removes only managed files", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		const neighborPath = join(
			targetRoot,
			".codex/openagentlayer/user-note.txt",
		);

		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await mkdir(join(targetRoot, ".codex/openagentlayer"), { recursive: true });
		await writeFile(neighborPath, "keep\n");

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.removedFiles).toContain(
			join(targetRoot, ".oal/manifest/codex-project.json"),
		);
		expect(await Bun.file(neighborPath).text()).toBe("keep\n");
		expect(
			await Bun.file(join(targetRoot, ".codex/config.toml")).exists(),
		).toBe(false);
	});

	test("uninstall removes AGENTS.md managed block only", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		const agentsPath = join(targetRoot, "AGENTS.md");
		await writeFile(agentsPath, "# User Instructions\n\nKeep this.\n");

		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toEqual([]);
		expect(await Bun.file(agentsPath).text()).toBe(
			"# User Instructions\n\nKeep this.\n",
		);
	});

	test("uninstall missing manifest is no-op", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.removedFiles).toEqual([]);
	});

	test("uninstall ignores forged manifest target root", async () => {
		const targetRoot = await createFixtureRoot();
		const forgedTargetRoot = await createFixtureRoot();
		const externalVictim = join(forgedTargetRoot, "victim.txt");
		const localManagedFile = join(targetRoot, "victim.txt");
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");

		await mkdir(join(targetRoot, ".oal/manifest"), { recursive: true });
		await writeFile(externalVictim, "external\n");
		await writeFile(localManagedFile, "local\n");
		await writeFile(
			manifestPath,
			JSON.stringify({
				entries: [
					{
						artifactKind: "config",
						path: "victim.txt",
						sha256: "forged",
						sourceRecordIds: [],
					},
				],
				generatedAt: "deterministic",
				scope: "project",
				surface: "codex",
				targetRoot: forgedTargetRoot,
			}),
		);

		await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(await Bun.file(externalVictim).text()).toBe("external\n");
		expect(await Bun.file(localManagedFile).exists()).toBe(false);
	});

	test("uninstall preserves user-edited managed config values", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await writeFile(
			join(targetRoot, ".codex/config.toml"),
			"[features]\nfast_mode = true\n",
		);

		const result = await uninstallManagedFiles({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "managed-content-changed" }),
		);
		expect(await Bun.file(join(targetRoot, ".codex/config.toml")).text()).toBe(
			"[features]\nfast_mode = true\n",
		);
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");
		expect(await Bun.file(manifestPath).exists()).toBe(true);
		const manifest = JSON.parse(await Bun.file(manifestPath).text()) as {
			readonly entries: readonly { readonly path: string }[];
		};
		expect(manifest.entries.map((entry) => entry.path)).toContain(
			".codex/config.toml",
		);
	});
});
