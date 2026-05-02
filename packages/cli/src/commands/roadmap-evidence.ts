import {
	buildRoadmapEvidence,
	renderRoadmapEvidenceMarkdown,
} from "@openagentlayer/accept";

export async function runRoadmapEvidenceCommand(
	repoRoot: string,
): Promise<void> {
	console.log(
		renderRoadmapEvidenceMarkdown(await buildRoadmapEvidence(repoRoot)),
	);
}
