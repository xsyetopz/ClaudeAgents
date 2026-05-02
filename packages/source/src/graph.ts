import type { OalSource } from "./records";

export interface SourceGraph {
	source: OalSource;
	sourcePath: string;
	agentIds: Set<string>;
	skillIds: Set<string>;
	routeIds: Set<string>;
	hookIds: Set<string>;
	toolIds: Set<string>;
	provenance: Map<string, string>;
}

export function createSourceGraph(
	sourceRoot: string,
	source: OalSource,
): SourceGraph {
	return {
		source,
		sourcePath: sourceRoot,
		agentIds: new Set(source.agents.map((agent) => agent.id)),
		skillIds: new Set(source.skills.map((skill) => skill.id)),
		routeIds: new Set(source.routes.map((route) => route.id)),
		hookIds: new Set(source.hooks.map((hook) => hook.id)),
		toolIds: new Set(source.tools.map((tool) => tool.id)),
		provenance: buildProvenance(sourceRoot, source),
	};
}

function buildProvenance(
	sourceRoot: string,
	source: OalSource,
): Map<string, string> {
	const provenance = new Map<string, string>();
	for (const agent of source.agents)
		provenance.set(
			`agent:${agent.id}`,
			`${sourceRoot}/agents/${agent.id}.json`,
		);
	for (const skill of source.skills)
		provenance.set(
			`skill:${skill.id}`,
			`${sourceRoot}/skills/${skill.id}.json`,
		);
	for (const route of source.routes)
		provenance.set(
			`route:${route.id}`,
			`${sourceRoot}/routes/${route.id}.json`,
		);
	for (const hook of source.hooks)
		provenance.set(`hook:${hook.id}`, `${sourceRoot}/hooks/${hook.id}.json`);
	for (const tool of source.tools)
		provenance.set(`tool:${tool.id}`, `${sourceRoot}/tools/${tool.id}.json`);
	return provenance;
}
