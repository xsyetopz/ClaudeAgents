import { join, relative } from "node:path";
import {
	readObject,
	readOptionalString,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type { CommandRecord, Diagnostic } from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";
import { readRequiredBodyFile } from "./shared";

export async function buildCommandRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<CommandRecord | undefined> {
	const source = base.raw;
	const ownerRole = readString(
		source,
		"owner_role",
		base.location.metadataPath,
		diagnostics,
	);
	const promptTemplate =
		readOptionalString(source, "prompt_template") ?? "prompt.md";
	const promptTemplateContent = await readRequiredBodyFile(
		recordDirectory,
		promptTemplate,
		diagnostics,
	);
	if (promptTemplateContent === undefined || ownerRole === undefined) {
		return undefined;
	}

	const bodyPath = relative(
		process.cwd(),
		join(recordDirectory, promptTemplate),
	);
	return {
		...base,
		kind: "command",
		owner_role: ownerRole,
		route_contract: readOptionalString(source, "route_contract"),
		aliases: readStringArray(
			source,
			"aliases",
			base.location.metadataPath,
			diagnostics,
		),
		prompt_template: promptTemplate,
		prompt_template_content: promptTemplateContent,
		arguments: readStringArray(
			source,
			"arguments",
			base.location.metadataPath,
			diagnostics,
		),
		invocation: readOptionalString(source, "invocation"),
		side_effect_level: readOptionalString(source, "side_effect_level"),
		surface_overrides: readObject(
			source,
			"surface_overrides",
			base.location.metadataPath,
			diagnostics,
		),
		model_policy: readOptionalString(
			source,
			"model_policy",
		) as CommandRecord["model_policy"],
		hook_policies: readStringArray(
			source,
			"hook_policies",
			base.location.metadataPath,
			diagnostics,
		),
		supporting_files: readStringArray(
			source,
			"supporting_files",
			base.location.metadataPath,
			diagnostics,
		),
		location: { ...base.location, bodyPath },
	};
}
