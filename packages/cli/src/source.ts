import { resolve } from "node:path";
import { renderAllProviders } from "@openagentlayer/adapter";
import { assertPolicyPass, validateSourceGraph } from "@openagentlayer/policy";
import { loadSource } from "@openagentlayer/source";

export async function loadCheckedSource(repoRoot: string) {
	const graph = await loadSource(resolve(repoRoot, "source"));
	assertPolicyPass(validateSourceGraph(graph));
	return graph.source;
}

export async function assertRenderableSource(repoRoot: string): Promise<void> {
	await renderAllProviders(await loadCheckedSource(repoRoot), repoRoot);
}
