import { expect, test } from "bun:test";
import { createManifest, manifestPath } from "../src";

test("manifest records ownership metadata for every artifact", () => {
	const manifest = createManifest([
		{
			provider: "codex",
			path: ".codex/config.toml",
			content: "[profiles.openagentlayer]\n",
			sourceId: "config:codex",
			mode: "config",
		},
		{
			provider: "codex",
			path: ".codex/openagentlayer/hooks/guard.mjs",
			content: "#!/usr/bin/env node\n",
			sourceId: "hook:guard",
			mode: "file",
			executable: true,
		},
	]);
	expect(manifest.entries).toHaveLength(2);
	expect(manifest.entries[0]?.structuredKeys).toContain(
		"profiles.openagentlayer",
	);
	expect(manifest.entries[1]?.executable).toBe(true);
	expect(manifestPath("opencode")).toBe(".oal/manifest/opencode.json");
});
