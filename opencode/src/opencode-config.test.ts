import { describe, expect, it } from "bun:test";
import {
	applyMcpToggles,
	buildAgentDisableConfig,
	buildMcpConfig,
	mergeInstructions,
} from "./opencode-config.ts";

describe("mergeInstructions", () => {
	it("adds managed instruction files without dropping existing entries", () => {
		const merged = mergeInstructions(
			{
				instructions: ["docs/team-rules.md"],
				mcp: buildMcpConfig(),
				agent: buildAgentDisableConfig(),
			},
			[".opencode/instructions/openagentsbtw.md"],
		);

		expect(merged["instructions"]).toEqual([
			"docs/team-rules.md",
			".opencode/instructions/openagentsbtw.md",
		]);
	});

	it("deduplicates managed instruction files", () => {
		const merged = mergeInstructions(
			{
				instructions: [".opencode/instructions/openagentsbtw.md"],
			},
			[".opencode/instructions/openagentsbtw.md"],
		);

		expect(merged["instructions"]).toEqual([
			".opencode/instructions/openagentsbtw.md",
		]);
	});
});

describe("applyMcpToggles", () => {
	it("enables chrome-devtools and browsermcp entries", () => {
		const config = applyMcpToggles(
			{ mcp: buildMcpConfig() },
			{ chromeDevtoolsMcp: true, browserMcp: true },
		);

		const mcp = config["mcp"] as Record<string, unknown>;
		expect(mcp["chrome-devtools"]).toEqual({
			type: "local",
			command: ["bunx", "-y", "chrome-devtools-mcp@latest"],
			enabled: true,
		});
		expect(mcp["browsermcp"]).toEqual({
			type: "local",
			command: ["bunx", "-y", "@browsermcp/mcp@latest"],
			enabled: true,
		});
	});

	it("disables chrome-devtools and browsermcp entries", () => {
		const config = applyMcpToggles(
			{
				mcp: {
					...buildMcpConfig(),
					"chrome-devtools": {
						type: "local",
						command: ["bunx", "-y", "chrome-devtools-mcp@latest"],
						enabled: true,
					},
					browsermcp: {
						type: "local",
						command: ["bunx", "-y", "@browsermcp/mcp@latest"],
						enabled: true,
					},
				},
			},
			{ chromeDevtoolsMcp: false, browserMcp: false },
		);

		const mcp = config["mcp"] as Record<string, unknown>;
		expect(mcp["chrome-devtools"]).toBeUndefined();
		expect(mcp["browsermcp"]).toBeUndefined();
		expect(mcp["context7"]).toBeTruthy();
		expect(mcp["octocode"]).toBeTruthy();
	});
});
