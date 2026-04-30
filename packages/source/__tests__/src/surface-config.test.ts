import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasErrors } from "@openagentlayer/diagnostics";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot, writeAgent } from "@openagentlayer/testkit";

describe("OAL source surface-config validation", () => {
	test("fails missing surface config", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await rm(join(root, "source/surface-configs/opencode"), {
			force: true,
			recursive: true,
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-surface-config",
		);
	});

	test("fails duplicate surface config", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		const directory = join(root, "source/surface-configs/opencode-copy");
		await mkdir(directory, { recursive: true });
		await writeFile(
			join(directory, "surface-config.toml"),
			[
				'id = "opencode-surface-config-copy"',
				'kind = "surface-config"',
				'title = "OpenCode Surface Config Copy"',
				'description = "Duplicate fixture."',
				'surface = "opencode"',
				'surfaces = ["opencode"]',
				'allowed_key_paths = ["*"]',
				"do_not_emit_key_paths = []",
				"validation_rules = []",
				"",
				"[project_defaults]",
				"",
				"[default_profile]",
				'profile_id = "fixture"',
				'placement = "generated-project-profile"',
				"emitted_key_paths = []",
				'source_url = "fixture"',
				'validation = "fixture"',
				"",
			].join("\n"),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-surface-config",
		);
	});
});
