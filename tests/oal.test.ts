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
import { checkSource } from "../packages/oal/src/check";
import { explain, render } from "../packages/oal/src/render";

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
