import { renderAllProviders, renderProvider } from "@openagentlayer/adapter";
import type { Artifact, ArtifactSet } from "@openagentlayer/artifact";
import { flag, option, providerOption } from "../arguments";
import { loadCheckedSource } from "../source";

export async function runPreviewCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const provider = providerOption(option(args, "--provider") ?? "all");
	const selectedPath = option(args, "--path");
	const includeContent = flag(args, "--content");
	const source = await loadCheckedSource(repoRoot);
	const rendered =
		provider === "all"
			? await renderAllProviders(source, repoRoot)
			: await renderProvider(provider, source, repoRoot);
	const artifacts = selectArtifacts(rendered.artifacts, selectedPath);
	if (selectedPath && artifacts.length === 0)
		throw new Error(`No generated artifact path matched ${selectedPath}.`);
	console.log(renderPreview({ ...rendered, artifacts }, { includeContent }));
}

function selectArtifacts(
	artifacts: Artifact[],
	selectedPath: string | undefined,
): Artifact[] {
	if (!selectedPath) return artifacts;
	return artifacts.filter((artifact) => artifact.path === selectedPath);
}

function renderPreview(
	rendered: ArtifactSet,
	options: { includeContent: boolean },
): string {
	const artifacts = [...rendered.artifacts].sort(compareArtifacts);
	const lines = [
		"# OpenAgentLayer Generated Artifact Preview",
		"",
		`Artifacts: ${artifacts.length}`,
		"",
		"## Artifact Tree",
	];

	let currentProvider = "";
	for (const artifact of artifacts) {
		if (artifact.provider !== currentProvider) {
			currentProvider = artifact.provider;
			lines.push("", `${currentProvider}/`);
		}
		lines.push(
			`  - ${artifact.path} [${artifact.mode}${artifact.executable ? ", executable" : ""}]`,
			`    source: ${artifact.sourceId}`,
			`    preview: ${firstLine(artifact.content)}`,
		);
	}

	if (rendered.unsupported.length > 0) {
		lines.push("", "## Unsupported Provider Capabilities");
		for (const unsupported of rendered.unsupported) {
			lines.push(
				`- ${unsupported.provider}: ${unsupported.capability} — ${unsupported.reason}`,
			);
		}
	}

	if (options.includeContent) {
		lines.push("", "## Artifact Contents");
		for (const artifact of artifacts) {
			lines.push(
				"",
				`### ${artifact.provider} ${artifact.path}`,
				`source: ${artifact.sourceId}`,
				`mode: ${artifact.mode}`,
				`executable: ${artifact.executable ? "yes" : "no"}`,
				"",
				`~~~${fenceLanguage(artifact.path)}`,
				artifact.content.trimEnd(),
				"~~~",
			);
		}
	}

	return `${lines.join("\n")}\n`;
}

function compareArtifacts(left: Artifact, right: Artifact): number {
	return (
		left.provider.localeCompare(right.provider) ||
		left.path.localeCompare(right.path)
	);
}

function firstLine(content: string): string {
	const line = content
		.split("\n")
		.find((candidate) => candidate.trim().length > 0)
		?.trim();
	return line ? line.slice(0, 120) : "<empty>";
}

function fenceLanguage(path: string): string {
	if (path.endsWith(".json") || path.endsWith(".jsonc")) return "json";
	if (path.endsWith(".toml")) return "toml";
	if (path.endsWith(".md")) return "markdown";
	if (path.endsWith(".mjs") || path.endsWith(".js")) return "js";
	if (path.endsWith(".ts")) return "ts";
	return "";
}
