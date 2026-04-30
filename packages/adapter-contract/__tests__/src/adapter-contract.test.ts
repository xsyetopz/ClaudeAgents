import { describe, expect, test } from "bun:test";
import { validateAdapterBundle } from "@openagentlayer/adapter-contract";

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
});
