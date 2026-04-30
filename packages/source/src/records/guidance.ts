import { join, relative } from "node:path";
import {
	readOptionalString,
	readString,
} from "@openagentlayer/diagnostics/coerce";
import type { Diagnostic, GuidanceRecord } from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";
import { readRequiredBodyFile } from "./shared";

export async function buildGuidanceRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<GuidanceRecord | undefined> {
	const source = base.raw;
	const authority = readString(
		source,
		"authority",
		base.location.metadataPath,
		diagnostics,
	);
	const body = readOptionalString(source, "body") ?? "body.md";
	const bodyContent = await readRequiredBodyFile(
		recordDirectory,
		body,
		diagnostics,
	);
	const injectionPoint = readString(
		source,
		"injection_point",
		base.location.metadataPath,
		diagnostics,
	);
	if (
		bodyContent === undefined ||
		authority === undefined ||
		injectionPoint === undefined
	) {
		return undefined;
	}

	const bodyPath = relative(process.cwd(), join(recordDirectory, body));
	return {
		...base,
		kind: "guidance",
		authority,
		body,
		body_content: bodyContent,
		injection_point: injectionPoint,
		location: { ...base.location, bodyPath },
	};
}
