import { relative } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import {
	asObject,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type { Diagnostic, SourceRecord, Surface } from "@openagentlayer/types";
import { buildAgentRecord } from "./records/agent";
import { buildCommandRecord } from "./records/command";
import { buildGuidanceRecord } from "./records/guidance";
import { buildModelPlanRecord } from "./records/model-plan";
import { buildPolicyRecord } from "./records/policy";
import type { SourceRecordBase } from "./records/shared";
import { readTextIfPresent } from "./records/shared";
import { buildSkillRecord } from "./records/skill";
import { buildSurfaceConfigRecord } from "./records/surface-config";
import { validateRecordFields, validateRecordIdentity } from "./validate";

export async function loadRecord(
	expectedKind: SourceRecord["kind"],
	recordDirectory: string,
	metadataPath: string,
	diagnostics: Diagnostic[],
): Promise<SourceRecord | undefined> {
	const relativeMetadataPath = relative(process.cwd(), metadataPath);
	const text = await readTextIfPresent(metadataPath);
	if (text === undefined) {
		diagnostics.push(
			errorDiagnostic(
				"missing-metadata",
				`Missing ${expectedKind} metadata file.`,
				relativeMetadataPath,
			),
		);
		return undefined;
	}

	const parsed = parseToml(text, relativeMetadataPath, diagnostics);
	const source = asObject(parsed, relativeMetadataPath, diagnostics);
	if (source === undefined) {
		return undefined;
	}

	const id = readString(source, "id", relativeMetadataPath, diagnostics);
	const kind = readString(source, "kind", relativeMetadataPath, diagnostics);
	const title = readString(source, "title", relativeMetadataPath, diagnostics);
	const description = readString(
		source,
		"description",
		relativeMetadataPath,
		diagnostics,
	);
	const surfaces = readStringArray(
		source,
		"surfaces",
		relativeMetadataPath,
		diagnostics,
		{ required: true },
	);

	if (
		id === undefined ||
		kind === undefined ||
		title === undefined ||
		description === undefined
	) {
		return undefined;
	}

	validateRecordIdentity(id, kind, surfaces, relativeMetadataPath, diagnostics);
	if (kind !== expectedKind) {
		diagnostics.push(
			errorDiagnostic(
				"kind-mismatch",
				`Expected kind '${expectedKind}', got '${kind}'.`,
				relativeMetadataPath,
			),
		);
		return undefined;
	}

	const base = {
		id,
		kind,
		title,
		description,
		surfaces: surfaces as readonly Surface[],
		location: {
			directory: relative(process.cwd(), recordDirectory),
			metadataPath: relativeMetadataPath,
			bodyPath: undefined,
		},
		raw: source,
	} as const;

	const record = await buildTypedRecord(base, recordDirectory, diagnostics);
	if (record !== undefined) {
		validateRecordFields(record, diagnostics);
	}

	return record;
}

async function buildTypedRecord(
	base: SourceRecordBase,
	recordDirectory: string,
	diagnostics: Diagnostic[],
): Promise<SourceRecord | undefined> {
	switch (base.kind) {
		case "agent":
			return await buildAgentRecord(base, recordDirectory, diagnostics);
		case "skill":
			return await buildSkillRecord(base, recordDirectory, diagnostics);
		case "command":
			return await buildCommandRecord(base, recordDirectory, diagnostics);
		case "policy":
			return buildPolicyRecord(base, diagnostics);
		case "guidance":
			return await buildGuidanceRecord(base, recordDirectory, diagnostics);
		case "model-plan":
			return buildModelPlanRecord(base, diagnostics);
		case "surface-config":
			return buildSurfaceConfigRecord(base, diagnostics);
		default:
			return undefined;
	}
}

function parseToml(
	text: string,
	path: string,
	diagnostics: Diagnostic[],
): unknown {
	try {
		return Bun.TOML.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		diagnostics.push(errorDiagnostic("invalid-toml", message, path));
		return {};
	}
}
