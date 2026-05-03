import { resolve } from "node:path";
import { renderAllProviders } from "@openagentlayer/adapter";
import { assertPolicyPass, validateSourceGraph } from "@openagentlayer/policy";
import { loadSource } from "@openagentlayer/source";

export interface RenderableSourceReport {
	sourceRoot: string;
	providers: string[];
	artifacts: number;
	unsupported: number;
}

export async function loadCheckedSource(repoRoot: string) {
	const graph = await loadSource(resolve(repoRoot, "source"));
	assertPolicyPass(validateSourceGraph(graph));
	return graph.source;
}

export async function assertRenderableSource(repoRoot: string): Promise<void> {
	await renderAllProviders(await loadCheckedSource(repoRoot), repoRoot);
}

export async function renderableSourceReport(
	repoRoot: string,
): Promise<RenderableSourceReport> {
	const sourceRoot = resolve(repoRoot, "source");
	const source = await loadCheckedSource(repoRoot);
	const rendered = await renderAllProviders(source, repoRoot);
	return {
		sourceRoot,
		providers: [
			...new Set(rendered.artifacts.map((artifact) => artifact.provider)),
		],
		artifacts: rendered.artifacts.length,
		unsupported: rendered.unsupported.length,
	};
}
