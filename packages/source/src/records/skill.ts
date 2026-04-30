import { join, relative, resolve, sep } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import {
	readBoolean,
	readObject,
	readOptionalString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	Diagnostic,
	SkillRecord,
	SkillSupportFile,
} from "@openagentlayer/types";
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

	const references = readStringArray(
		source,
		"references",
		base.location.metadataPath,
		diagnostics,
	);
	const scripts = readStringArray(
		source,
		"scripts",
		base.location.metadataPath,
		diagnostics,
	);
	const assets = readStringArray(
		source,
		"assets",
		base.location.metadataPath,
		diagnostics,
	);
	const supportingFiles = readStringArray(
		source,
		"supporting_files",
		base.location.metadataPath,
		diagnostics,
	);
	const supportFiles = await readSkillSupportFiles(
		recordDirectory,
		[
			...references.map((path) => ({ category: "reference" as const, path })),
			...scripts.map((path) => ({ category: "script" as const, path })),
			...assets.map((path) => ({ category: "asset" as const, path })),
			...supportingFiles.map((path) => ({
				category: "supporting-file" as const,
				path,
			})),
		],
		base.location.metadataPath,
		diagnostics,
	);

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
		license: readOptionalString(source, "license"),
		compatibility: readOptionalString(source, "compatibility"),
		metadata: readObject(
			source,
			"metadata",
			base.location.metadataPath,
			diagnostics,
		),
		allowed_tools: readStringArray(
			source,
			"allowed_tools",
			base.location.metadataPath,
			diagnostics,
		),
		references,
		scripts,
		assets,
		support_files: supportFiles,
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
		supporting_files: supportingFiles,
		location: { ...base.location, bodyPath },
	};
}

async function readSkillSupportFiles(
	recordDirectory: string,
	paths: readonly {
		readonly category: SkillSupportFile["category"];
		readonly path: string;
	}[],
	metadataPath: string,
	diagnostics: Diagnostic[],
): Promise<readonly SkillSupportFile[]> {
	const root = resolve(recordDirectory);
	const seen = new Set<string>();
	const supportFiles: SkillSupportFile[] = [];
	for (const { category, path } of paths) {
		if (seen.has(path)) {
			continue;
		}
		seen.add(path);
		const resolvedPath = resolve(recordDirectory, path);
		if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${sep}`)) {
			diagnostics.push(
				errorDiagnostic(
					"invalid-skill-support-file",
					`Skill support file '${path}' escapes the skill directory.`,
					metadataPath,
				),
			);
			continue;
		}

		if (!(await Bun.file(resolvedPath).exists())) {
			diagnostics.push(
				errorDiagnostic(
					"missing-skill-support-file",
					`Skill support file '${path}' does not exist.`,
					metadataPath,
				),
			);
			continue;
		}

		supportFiles.push({
			category,
			content: await Bun.file(resolvedPath).text(),
			path,
		});
	}
	return supportFiles.sort((left, right) =>
		left.path.localeCompare(right.path),
	);
}
