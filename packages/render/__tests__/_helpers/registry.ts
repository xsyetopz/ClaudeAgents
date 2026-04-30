import type { AdapterBundle } from "@openagentlayer/adapter-contract";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import type { SourceGraph, Surface } from "@openagentlayer/types";

export async function loadFixtureGraph(): Promise<SourceGraph> {
	const sourceResult = await loadSourceGraph(process.cwd());
	if (sourceResult.graph === undefined) {
		throw new Error("Expected graph.");
	}
	return sourceResult.graph;
}

export async function renderSurfaceBundle(
	surface: Surface,
	options: { readonly modelPlanId?: string } = {},
): Promise<AdapterBundle> {
	const graph = await loadFixtureGraph();
	return createAdapterRegistry().renderSurfaceBundle(graph, surface, options);
}

export async function renderAllBundles(): Promise<readonly AdapterBundle[]> {
	return createAdapterRegistry().renderAllBundles(await loadFixtureGraph());
}

export function artifactPaths(bundle: AdapterBundle): readonly string[] {
	return bundle.artifacts.map((artifact) => artifact.path);
}

export function artifactContent(
	bundle: AdapterBundle,
	path: string,
): string | undefined {
	return bundle.artifacts.find((artifact) => artifact.path === path)?.content;
}

export async function runHookArtifact(content: string): Promise<unknown> {
	const process = Bun.spawn(["bun", "-e", content], {
		stderr: "pipe",
		stdin: "pipe",
		stdout: "pipe",
	});
	process.stdin.write("{}");
	process.stdin.end();
	const output = await new Response(process.stdout).text();
	await process.exited;
	return JSON.parse(output);
}
