import { describe, expect, test } from "bun:test";
import { validateAdapterBundle } from "@openagentlayer/adapter-contract";
import type { AdapterBundle } from "@openagentlayer/adapter-contract/artifacts";
import type { InstallPlan } from "@openagentlayer/adapter-contract/install";

describe("OAL adapter contract", () => {
	test("rejects duplicate artifact paths", () => {
		const diagnostics = validateAdapterBundle({
			adapterId: "codex",
			surface: "codex",
			diagnostics: [],
			artifacts: [
				{
					surface: "codex",
					kind: "validation-metadata",
					path: ".codex/openagentlayer/records/agent/a.json",
					content: "{}\n",
					sourceRecordIds: ["a"],
				},
				{
					surface: "codex",
					kind: "validation-metadata",
					path: ".codex/openagentlayer/records/agent/a.json",
					content: "{}\n",
					sourceRecordIds: ["a"],
				},
			],
		});

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
			"duplicate-artifact-path",
		]);
	});

	test("exposes focused contract subpaths", () => {
		const bundle: AdapterBundle = {
			adapterId: "codex",
			surface: "codex",
			diagnostics: [],
			artifacts: [],
		};
		const installPlan: InstallPlan = {
			surface: "codex",
			scope: "project",
			entries: [],
		};

		expect(bundle.surface).toBe("codex");
		expect(installPlan.scope).toBe("project");
	});
});
