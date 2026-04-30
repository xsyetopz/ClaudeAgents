import type { Diagnostic, UnknownMap } from "@openagentlayer/types";
import { errorDiagnostic } from "./factory";

export function asObject(
	value: unknown,
	path: string,
	diagnostics: Diagnostic[],
): UnknownMap | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-toml-shape",
				"TOML root must be an object.",
				path,
			),
		);
		return undefined;
	}

	return value as UnknownMap;
}

export function readString(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): string | undefined {
	const value = source[key];
	if (typeof value === "string" && value.length > 0) {
		return value;
	}

	diagnostics.push(
		errorDiagnostic(
			"missing-string",
			`Missing required string field '${key}'.`,
			path,
		),
	);
	return undefined;
}

export function readOptionalString(
	source: UnknownMap,
	key: string,
): string | undefined {
	const value = source[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readBoolean(
	source: UnknownMap,
	key: string,
): boolean | undefined {
	const value = source[key];
	return typeof value === "boolean" ? value : undefined;
}

export function readStringArray(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
	options: { readonly required?: boolean } = {},
): readonly string[] {
	const value = source[key];
	if (value === undefined) {
		if (options.required === true) {
			diagnostics.push(
				errorDiagnostic(
					"missing-array",
					`Missing required string array '${key}'.`,
					path,
				),
			);
		}
		return [];
	}

	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-array",
				`Field '${key}' must be a string array.`,
				path,
			),
		);
		return [];
	}

	return value;
}

export function readObject(
	source: UnknownMap,
	key: string,
	path: string,
	diagnostics: Diagnostic[],
): UnknownMap {
	const value = source[key];
	if (value === undefined) {
		return {};
	}

	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-object",
				`Field '${key}' must be an object.`,
				path,
			),
		);
		return {};
	}

	return value as UnknownMap;
}
