import { deterministicDigest, redactSecrets } from "../reports/schema";
import { buildHandoffReport } from "../reports/status";

export interface HermesCurrentHandoff {
	schemaVersion: 1;
	command: "handoff current";
	projectRoot: string;
	summary: string;
	actionItems: string[];
	warnings: string[];
	compact: true;
	markdown: string;
	redactions: string[];
	digest: string;
}

export async function buildCurrentHandoff(
	projectRoot: string = process.cwd(),
): Promise<HermesCurrentHandoff> {
	const base = await buildHandoffReport(projectRoot);
	const markdown = redactSecrets(base.markdown);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "handoff current" as const,
		projectRoot: base.projectRoot,
		summary: base.summary,
		actionItems: base.actionItems,
		warnings: base.warnings,
		compact: true as const,
		markdown: markdown.text,
		redactions: markdown.redactions,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}
