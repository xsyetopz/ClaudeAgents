import type { SourceGraph } from "@openagentlayer/types";
import { resolveHookEvent } from "../../shared";
import { CLAUDE_ARTIFACT_ROOT, CLAUDE_SURFACE } from "./constants";

export function renderClaudeSettings(
	graph: SourceGraph,
): Record<string, unknown> {
	const projectDefaults =
		graph.surfaceConfigs.find((record) => record.surface === CLAUDE_SURFACE)
			?.project_defaults ?? {};
	const hooks: Record<string, unknown[]> = {};
	for (const record of graph.policies.filter((record) =>
		record.surfaces.includes(CLAUDE_SURFACE),
	)) {
		const event = resolveHookEvent(record, CLAUDE_SURFACE);
		hooks[event] = [
			...(hooks[event] ?? []),
			{
				hooks: [
					{
						command: `bun ${CLAUDE_ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`,
						statusMessage: `checking ${record.id}...`,
						timeout: 10,
						type: "command",
					},
				],
				...(record.matcher === undefined ? {} : { matcher: record.matcher }),
			},
		];
	}
	return {
		...projectDefaults,
		hooks,
	};
}
