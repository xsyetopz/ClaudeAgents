import {
	readObject,
	readString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	ConfigReplacement,
	DefaultProfile,
	Diagnostic,
	Surface,
	SurfaceConfigRecord,
	UnknownMap,
} from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";

export function buildSurfaceConfigRecord(
	base: SourceRecordBase,
	diagnostics: Diagnostic[],
): SurfaceConfigRecord | undefined {
	const source = base.raw;
	const surface = readString(
		source,
		"surface",
		base.location.metadataPath,
		diagnostics,
	);
	if (surface === undefined) {
		return undefined;
	}

	return {
		...base,
		kind: "surface-config",
		surface: surface as Surface,
		allowed_key_paths: readStringArray(
			source,
			"allowed_key_paths",
			base.location.metadataPath,
			diagnostics,
			{ required: true },
		),
		do_not_emit_key_paths: readStringArray(
			source,
			"do_not_emit_key_paths",
			base.location.metadataPath,
			diagnostics,
		),
		project_defaults: readObject(
			source,
			"project_defaults",
			base.location.metadataPath,
			diagnostics,
		),
		default_profile: readDefaultProfile(
			source,
			base.location.metadataPath,
			diagnostics,
		),
		replacements: readReplacementArray(
			source,
			"replacements",
			base.location.metadataPath,
			diagnostics,
		),
		validation_rules: readStringArray(
			source,
			"validation_rules",
			base.location.metadataPath,
			diagnostics,
		),
	};
}

function readDefaultProfile(
	source: UnknownMap,
	path: string,
	diagnostics: Diagnostic[],
): DefaultProfile {
	const value = readObject(source, "default_profile", path, diagnostics);
	return {
		profile_id: readString(value, "profile_id", path, diagnostics) ?? "",
		placement: readString(value, "placement", path, diagnostics) ?? "",
		emitted_key_paths: readStringArray(
			value,
			"emitted_key_paths",
			path,
			diagnostics,
			{ required: true },
		),
		source_url: readString(value, "source_url", path, diagnostics) ?? "",
		validation: readString(value, "validation", path, diagnostics) ?? "",
	};
}

function readReplacementArray(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): readonly ConfigReplacement[] {
	return readObjectArray(source, key, path, diagnostics).flatMap((value) => {
		const from = readString(value, "from", path, diagnostics);
		const to = readString(value, "to", path, diagnostics);
		const reason = readString(value, "reason", path, diagnostics);
		const sourceUrl = readString(value, "source_url", path, diagnostics);
		if (
			from === undefined ||
			to === undefined ||
			reason === undefined ||
			sourceUrl === undefined
		) {
			return [];
		}
		return [{ from, to, reason, source_url: sourceUrl }];
	});
}

function readObjectArray(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): readonly UnknownMap[] {
	const value = source[key];
	if (value === undefined) {
		return [];
	}

	if (
		!Array.isArray(value) ||
		value.some(
			(item) =>
				typeof item !== "object" || item === null || Array.isArray(item),
		)
	) {
		diagnostics.push({
			level: "error",
			code: "invalid-array",
			message: `Field '${key}' must be an object array.`,
			path,
		});
		return [];
	}

	return value as readonly UnknownMap[];
}
