import { join, relative } from "node:path";
import {
	readBoolean,
	readOptionalString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type { Diagnostic, SkillRecord } from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";
import { readRequiredBodyFile } from "./shared";

export async function buildSkillRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<SkillRecord | undefined> {
	const source = base.raw;
	const body = readOptionalString(source, "body") ?? "SKILL.md";
	const bodyContent = await readRequiredBodyFile(
		recordDirectory,
		body,
		diagnostics,
	);
	if (bodyContent === undefined) {
		return undefined;
	}

	const bodyPath = relative(process.cwd(), join(recordDirectory, body));
	return {
		...base,
		kind: "skill",
		triggers: readStringArray(
			source,
			"triggers",
			base.location.metadataPath,
			diagnostics,
		),
		body,
		body_content: bodyContent,
		references: readStringArray(
			source,
			"references",
			base.location.metadataPath,
			diagnostics,
		),
		scripts: readStringArray(
			source,
			"scripts",
			base.location.metadataPath,
			diagnostics,
		),
		assets: readStringArray(
			source,
			"assets",
			base.location.metadataPath,
			diagnostics,
		),
		when_to_use: readOptionalString(source, "when_to_use"),
		invocation_mode: readOptionalString(source, "invocation_mode"),
		user_invocable: readBoolean(source, "user_invocable"),
		tool_grants: readStringArray(
			source,
			"tool_grants",
			base.location.metadataPath,
			diagnostics,
		),
		route_contract: readOptionalString(source, "route_contract"),
		model_policy: readOptionalString(
			source,
			"model_policy",
		) as SkillRecord["model_policy"],
		supporting_files: readStringArray(
			source,
			"supporting_files",
			base.location.metadataPath,
			diagnostics,
		),
		location: { ...base.location, bodyPath },
	};
}
