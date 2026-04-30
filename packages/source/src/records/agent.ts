import { join, relative } from "node:path";
import {
	readBoolean,
	readOptionalString,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type { AgentMode, AgentRecord, Diagnostic } from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";
import { readRequiredBodyFile } from "./shared";

export async function buildAgentRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<AgentRecord | undefined> {
	const source = base.raw;
	const role = readString(
		source,
		"role",
		base.location.metadataPath,
		diagnostics,
	);
	const prompt = readOptionalString(source, "prompt") ?? "prompt.md";
	const promptContent = await readRequiredBodyFile(
		recordDirectory,
		prompt,
		diagnostics,
	);
	if (promptContent === undefined) {
		return undefined;
	}

	if (role === undefined) {
		return undefined;
	}

	const bodyPath = relative(process.cwd(), join(recordDirectory, prompt));
	return {
		...base,
		kind: "agent",
		role,
		prompt,
		prompt_content: promptContent,
		mode: (readOptionalString(source, "mode") ?? "both") as AgentMode,
		route_contract: readOptionalString(source, "route_contract"),
		model_intent: readOptionalString(source, "model_intent"),
		family: readOptionalString(source, "family"),
		primary: readBoolean(source, "primary"),
		subagent: readBoolean(source, "subagent"),
		model_class: readOptionalString(source, "model_class"),
		effort_ceiling: readOptionalString(
			source,
			"effort_ceiling",
		) as AgentRecord["effort_ceiling"],
		budget_tier: readOptionalString(source, "budget_tier"),
		handoff_contract: readOptionalString(source, "handoff_contract"),
		permissions: readStringArray(
			source,
			"permissions",
			base.location.metadataPath,
			diagnostics,
		),
		skills: readStringArray(
			source,
			"skills",
			base.location.metadataPath,
			diagnostics,
		),
		commands: readStringArray(
			source,
			"commands",
			base.location.metadataPath,
			diagnostics,
		),
		policies: readStringArray(
			source,
			"policies",
			base.location.metadataPath,
			diagnostics,
		),
		location: { ...base.location, bodyPath },
	};
}
