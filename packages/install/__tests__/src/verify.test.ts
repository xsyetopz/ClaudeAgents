import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	applyInstallPlan,
	verifyManagedInstall,
} from "@openagentlayer/install";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { createInstallFixture } from "../_helpers/install";

describe("OAL installer verification", () => {
	test("install verification accepts clean managed files", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toEqual([]);
	});

	test("install verification reports missing managed files", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await rm(join(targetRoot, ".codex/config.toml"), {
			force: true,
		});

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "missing-file" }),
		);
	});

	test("install verification reports hash mismatch", async () => {
		const { targetRoot, codexBundle } = await createInstallFixture();
		await applyInstallPlan({
			bundle: codexBundle,
			scope: "project",
			targetRoot,
		});
		await writeFile(join(targetRoot, ".codex/config.toml"), "changed\n");

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "hash-mismatch" }),
		);
	});

	test("install verification reports forged escaping manifest path", async () => {
		const targetRoot = await createFixtureRoot();
		const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");
		await mkdir(join(targetRoot, ".oal/manifest"), { recursive: true });
		await writeFile(
			manifestPath,
			JSON.stringify({
				entries: [
					{
						artifactKind: "config",
						path: "../escape.txt",
						sha256: "bad",
						sourceRecordIds: [],
					},
				],
				generatedAt: "deterministic",
				scope: "project",
				surface: "codex",
				targetRoot,
			}),
		);

		const result = await verifyManagedInstall({
			scope: "project",
			surface: "codex",
			targetRoot,
		});

		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: "path-escape" }),
		);
	});
});
