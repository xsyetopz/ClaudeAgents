import { describe, expect, test } from "bun:test";
import {
	cpSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { codexAdapter } from "../packages/oal/src/adapters/codex";
import { checkSource } from "../packages/oal/src/check";
import { doctorHooks } from "../packages/oal/src/doctor";
import { explain, render } from "../packages/oal/src/render";
import { loadSource } from "../packages/oal/src/source";

const repoRoot = process.cwd();

function tempRepo(): string {
	const root = join(tmpdir(), `oal-test-${crypto.randomUUID()}`);
	mkdirSync(root, { recursive: true });
	cpSync(resolve(repoRoot, "source"), resolve(root, "source"), {
		recursive: true,
	});
	return root;
}

function withTempRepo(run: (root: string) => void): void {
	const root = tempRepo();
	try {
		run(root);
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
}

function mutateJson(
	root: string,
	path: string,
	mutate: (value: Record<string, unknown>) => void,
): void {
	const fullPath = resolve(root, path);
	const value = JSON.parse(readFileSync(fullPath, "utf8")) as Record<
		string,
		unknown
	>;
	mutate(value);
	writeFileSync(fullPath, `${JSON.stringify(value, null, "\t")}\n`);
}

describe("oal check", () => {
	test("accepts current source graph", () => {
		expect(() => checkSource(repoRoot)).not.toThrow();
	});

	test("rejects invalid Greek-gods agent names", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/agents/athena.json", (agent) => {
				agent["id"] = "planner";
			});
			expect(() => checkSource(root)).toThrow(
				"source/agents/athena.json failed source/schema/agent.schema.json",
			);
		});
	});

	test("rejects unsupported Codex model ids", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/routes/models.json", (models) => {
				(
					(models["codex"] as Record<string, unknown>)["routes"] as Record<
						string,
						unknown
					>
				)["plan"] = "gpt-6";
			});
			expect(() => checkSource(root)).toThrow(
				"route uses unsupported model id",
			);
		});
	});

	test("rejects poisoned Codex allowed model sets", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/routes/models.json", (models) => {
				(
					(models["codex"] as Record<string, unknown>)[
						"allowed_models"
					] as string[]
				).push("gpt-6");
				(
					(models["codex"] as Record<string, unknown>)["routes"] as Record<
						string,
						unknown
					>
				)["plan"] = "gpt-6";
			});
			expect(() => checkSource(root)).toThrow(
				"allowed model set contains unsupported model id",
			);
		});
	});

	test("rejects unsupported Claude Code model ids", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/routes/models.json", (models) => {
				(
					(models["claude"] as Record<string, unknown>)["routes"] as Record<
						string,
						unknown
					>
				)["plan"] = "claude-plus";
			});
			expect(() => checkSource(root)).toThrow(
				"route uses unsupported model id",
			);
		});
	});

	test("accepts Greek-agent model profiles for Codex and Claude", () => {
		withTempRepo((root) => {
			expect(() => checkSource(root)).not.toThrow();
			const codexConfig = JSON.parse(
				readFileSync(
					resolve(root, "source/platforms/codex/config.json"),
					"utf8",
				),
			) as Record<string, unknown>;
			const claudeConfig = JSON.parse(
				readFileSync(
					resolve(root, "source/platforms/claude/config.json"),
					"utf8",
				),
			) as Record<string, unknown>;
			const codexPro20 = (
				(codexConfig["profile_defaults"] as Record<string, unknown>)[
					"pro-20"
				] as Record<string, unknown>
			)["agents"] as Record<string, Record<string, string>>;
			const claudeMax20 = (
				(claudeConfig["profile_defaults"] as Record<string, unknown>)[
					"max-20"
				] as Record<string, unknown>
			)["agents"] as Record<string, Record<string, string>>;
			expect(codexPro20["nemesis"]).toEqual({
				effort: "high",
				model: "gpt-5.5",
			});
			expect(codexPro20["hephaestus"]).toEqual({
				effort: "high",
				model: "gpt-5.3-codex",
			});
			expect(claudeMax20["athena"]).toEqual({
				effort: "high",
				model: "claude-opus-4-7",
			});
			expect(claudeMax20["calliope"]).toEqual({
				effort: "medium",
				model: "claude-haiku-4-5",
			});
		});
	});

	test("rejects profile defaults with unavailable models", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/platforms/codex/config.json", (config) => {
				(
					(
						(config["profile_defaults"] as Record<string, unknown>)[
							"plus"
						] as Record<string, unknown>
					)["agents"] as Record<string, Record<string, string>>
				)["nemesis"]["model"] = "gpt-6";
			});
			expect(() => checkSource(root)).toThrow(
				"profile default uses unavailable model id",
			);
		});
	});

	test("rejects profile defaults with unsupported efforts", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/platforms/claude/config.json", (config) => {
				(
					(
						(config["profile_defaults"] as Record<string, unknown>)[
							"max-5"
						] as Record<string, unknown>
					)["agents"] as Record<string, Record<string, string>>
				)["nemesis"]["effort"] = "none";
			});
			expect(() => checkSource(root)).toThrow(
				"profile default uses unsupported effort",
			);
		});
	});

	test("rejects profile defaults missing Greek-gods agents", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/platforms/codex/config.json", (config) => {
				delete (
					(
						(config["profile_defaults"] as Record<string, unknown>)[
							"pro-5"
						] as Record<string, unknown>
					)["agents"] as Record<string, unknown>
				)["atalanta"];
			});
			expect(() => checkSource(root)).toThrow(
				"profile default missing Greek-gods agent",
			);
		});
	});

	test("rejects unsupported OpenCode fallback model ids", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/routes/models.json", (models) => {
				(
					(models["opencode"] as Record<string, unknown>)["routes"] as Record<
						string,
						unknown
					>
				)["utility"] = "opencode/paid-only";
			});
			expect(() => checkSource(root)).toThrow(
				"route uses unsupported model id",
			);
		});
	});

	test("rejects hook ids without category prefix", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/hooks/tool-pre-shell-rtk.json", (hook) => {
				hook["id"] = "tool-post-shell-rtk";
			});
			expect(() => checkSource(root)).toThrow(
				"hook id must start with hook category prefix",
			);
		});
	});

	test("rejects providers without provenance", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/providers/providers.json", (providers) => {
				delete (
					(providers["providers"] as Record<string, unknown>)[
						"caveman"
					] as Record<string, unknown>
				)["provenance"];
			});
			expect(() => checkSource(root)).toThrow(
				"source/providers/providers.json failed source/schema/providers.schema.json",
			);
		});
	});

	test("rejects Linux tool records without install detection", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/tools/tools.json", (tools) => {
				delete (
					(
						(tools["tools"] as Record<string, unknown>)["rg"] as Record<
							string,
							unknown
						>
					)["install"] as Record<string, unknown>
				)["linux"];
			});
			expect(() => checkSource(root)).toThrow(
				"source/tools/tools.json failed source/schema/tools.schema.json",
			);
		});
	});

	test("rejects Claude Code plus consumer profile", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/routes/subscriptions.json", (subscriptions) => {
				(subscriptions["claude"] as Record<string, unknown>)["blocked"] = [];
			});
			expect(() => checkSource(root)).toThrow(
				"Claude Code plus consumer profile must be blocked",
			);
		});
	});

	test("rejects extra subscription tiers", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/routes/subscriptions.json", (subscriptions) => {
				(
					(subscriptions["codex"] as Record<string, unknown>)[
						"allowed"
					] as string[]
				).push("enterprise");
			});
			expect(() => checkSource(root)).toThrow(
				"subscription allowed set contains unsupported tier",
			);
		});
	});

	test("loads enabled platform records dynamically", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/oal.json", (oal) => {
				oal["platforms"] = ["codex"];
			});
			rmSync(resolve(root, "source/platforms/claude"), {
				force: true,
				recursive: true,
			});
			rmSync(resolve(root, "source/platforms/opencode"), {
				force: true,
				recursive: true,
			});
			expect(() => checkSource(root)).not.toThrow();
		});
	});

	test("rejects enabled platforms without registered adapter", () => {
		withTempRepo((root) => {
			mkdirSync(resolve(root, "source/platforms/kilo"), { recursive: true });
			writeFileSync(
				resolve(root, "source/platforms/kilo/platform.json"),
				`${JSON.stringify(
					{
						$schema: "../../schema/platform.schema.json",
						id: "kilo",
						native_surfaces: ["agents"],
						renderers: ["agents"],
						roots: {
							global: "~/.kilo",
							project: ".",
						},
					},
					null,
					"\t",
				)}\n`,
			);
			writeFileSync(
				resolve(root, "source/platforms/kilo/config.json"),
				`${JSON.stringify(
					{
						$schema: "../../schema/platform-config.schema.json",
						binary: "kilo",
						managed_keys: ["agents"],
						platform: "kilo",
						schemas: {
							generated_config: "codex_config",
						},
					},
					null,
					"\t",
				)}\n`,
			);
			mutateJson(root, "source/oal.json", (oal) => {
				oal["platforms"] = ["codex", "kilo"];
			});
			expect(() => checkSource(root)).toThrow(
				"enabled platform has no registered adapter",
			);
			expect(() => render(root, resolve(root, "out"))).toThrow(
				"enabled platform has no registered adapter: kilo",
			);
		});
	});
});

describe("oal render", () => {
	test("renders deterministic tree with manifest and explain map", () => {
		withTempRepo((root) => {
			const first = resolve(root, "first");
			const second = resolve(root, "second");
			render(root, first);
			render(root, second);
			expect(readFileSync(resolve(first, "source-index.json"), "utf8")).toEqual(
				readFileSync(resolve(second, "source-index.json"), "utf8"),
			);
			expect(
				readFileSync(resolve(first, ".oal/render-manifest.json"), "utf8"),
			).toEqual(
				readFileSync(resolve(second, ".oal/render-manifest.json"), "utf8"),
			);
			expect(readFileSync(resolve(first, "codex/AGENTS.md"), "utf8")).toContain(
				"### Athena",
			);
			expect(
				readFileSync(resolve(first, "codex/config.toml"), "utf8"),
			).toContain("multi_agent_v2 = true");
			const managedFiles = JSON.parse(
				readFileSync(resolve(first, ".oal/managed-files.json"), "utf8"),
			) as { files: string[] };
			expect(managedFiles.files).toContain(".oal/render-manifest.json");
			expect(managedFiles.files).toContain(".oal/managed-files.json");
			expect(managedFiles.files).toContain(".oal/explain-map.json");
			expect(explain(root, `${first}/agents/athena.json`, first)).toEqual({
				sha256: expect.any(String),
				sources: ["source/agents/athena.json"],
			});
		});
	});
});

describe("oal doctor", () => {
	test("reports Codex detect and capabilities", () => {
		withTempRepo((root) => {
			const graph = loadSource(root);
			expect(codexAdapter.detect(root, graph)).toMatchObject({
				binary: "codex",
				platform: "codex",
				project_root: root,
			});
			expect(codexAdapter.capabilities(graph).surfaces).toMatchObject({
				agents: "supported",
				hooks: "supported",
				instructions: "supported",
				mcp: "manual",
				model_routes: "manual",
			});
		});
	});

	test("reports Codex hook mappings without fake parity", () => {
		withTempRepo((root) => {
			const result = doctorHooks("codex", root);
			expect(result.ok).toBe(true);
			expect(result.checks).toContainEqual({
				message: "tool-pre-shell-rtk: codex hook mapping supported",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
		});
	});
});
