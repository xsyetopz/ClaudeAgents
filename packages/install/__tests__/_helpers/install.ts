import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot } from "@openagentlayer/testkit";

export async function createInstallFixture() {
	const sourceResult = await loadSourceGraph(process.cwd());
	if (sourceResult.graph === undefined) {
		throw new Error("Expected graph.");
	}
	const targetRoot = await createFixtureRoot();
	const registry = createAdapterRegistry();
	return {
		targetRoot,
		codexBundle: registry.renderSurfaceBundle(sourceResult.graph, "codex"),
	};
}
