import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";

describe("OAL adapter registry ordering", () => {
	test("registers required surfaces deterministically", () => {
		const registry = createAdapterRegistry();

		expect(registry.adapters.map((adapter) => adapter.surface)).toEqual([
			"claude",
			"codex",
			"opencode",
		]);
	});
});
