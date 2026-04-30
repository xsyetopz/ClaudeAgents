import { describe, expect, test } from "bun:test";
import { validateConfigObject } from "@openagentlayer/adapters/shared";
import type { SourceGraph } from "@openagentlayer/types";

describe("OAL adapter config validation", () => {
	test("rejects unknown and blocked config keys", () => {
		const diagnostics = validateConfigObject({
			artifactPath: "config.json",
			config: { allowed: true, blocked: true, extra: true },
			graph: fixtureGraph,
			surface: "codex",
		});

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-config-key",
		);
		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"blocked-config-key",
		);
	});

	test("rejects replacement source key without replacement target", () => {
		const diagnostics = validateConfigObject({
			artifactPath: "config.json",
			config: { old_key: true },
			graph: fixtureGraph,
			surface: "codex",
		});

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-config-replacement",
		);
	});

	test("validates nested array object key paths", () => {
		const diagnostics = validateConfigObject({
			artifactPath: "config.toml",
			config: {
				hooks: {
					Stop: [
						{
							extra: true,
							hooks: [{ command: "bun runtime.mjs", type: "command" }],
						},
					],
				},
			},
			graph: fixtureGraph,
			surface: "codex",
		});

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-config-key",
		);
		expect(
			diagnostics.map((diagnostic) => diagnostic.message).join("\n"),
		).toContain("hooks.Stop.extra");
	});
});

const fixtureGraph = {
	agents: [],
	byId: new Map(),
	commands: [],
	guidance: [],
	modelPlans: [],
	policies: [],
	records: [],
	skills: [],
	surfaceConfigs: [
		{
			allowed_key_paths: [
				"allowed",
				"old_key",
				"new_key",
				"hooks.*.hooks.command",
				"hooks.*.hooks.type",
			],
			default_profile: {
				emitted_key_paths: [],
				placement: "generated-project-profile",
				profile_id: "fixture",
				source_url: "fixture",
				validation: "fixture",
			},
			description: "Fixture.",
			do_not_emit_key_paths: ["blocked"],
			id: "codex-surface-config",
			kind: "surface-config",
			location: {
				bodyPath: undefined,
				directory: "fixture",
				metadataPath: "fixture",
			},
			project_defaults: {},
			raw: {},
			replacements: [
				{
					from: "old_key",
					reason: "fixture",
					source_url: "fixture",
					to: "new_key",
				},
			],
			surface: "codex",
			surfaces: ["codex"],
			title: "Fixture",
			validation_rules: [],
		},
	],
} satisfies SourceGraph;
