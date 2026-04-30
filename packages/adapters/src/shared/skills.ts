import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import type { SkillRecord, Surface } from "@openagentlayer/types";
import type { FrontmatterValueMap } from "./markdown";
import { renderMarkdownWithFrontmatter } from "./markdown";

export function renderAgentSkillMarkdown(
	record: SkillRecord,
	frontmatter: FrontmatterValueMap,
): string {
	return renderMarkdownWithFrontmatter(
		{
			compatibility: record.compatibility,
			description: record.description,
			license: record.license,
			metadata:
				Object.keys(record.metadata).length === 0 ? undefined : record.metadata,
			name: record.id,
			...frontmatter,
		},
		record.body_content,
	);
}

export function renderSkillSupportArtifacts(
	record: SkillRecord,
	surface: Surface,
	skillRoot: string,
): readonly AdapterArtifact[] {
	return record.support_files.map((file) => ({
		content: file.content,
		kind: "skill",
		path: `${skillRoot}/${file.path}`,
		sourceRecordIds: [record.id],
		surface,
	}));
}

export function disablesImplicitSkillInvocation(record: SkillRecord): boolean {
	return (
		record.invocation_mode === "manual-only" ||
		record.invocation_mode === "route-only" ||
		record.invocation_mode === "explicit-only" ||
		record.invocation_mode === "disable-model-invocation"
	);
}
