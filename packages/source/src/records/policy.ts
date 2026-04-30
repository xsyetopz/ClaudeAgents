import {
	readBoolean,
	readObject,
	readOptionalString,
	readStringArray,
} from "@openagentlayer/diagnostics/coerce";
import type {
	Diagnostic,
	PolicyCategory,
	PolicyFailureMode,
	PolicyHandlerClass,
	PolicyRecord,
} from "@openagentlayer/types";
import type { SourceRecordBase } from "./shared";

export function buildPolicyRecord(
	base: SourceRecordBase,
	diagnostics: Diagnostic[],
): PolicyRecord {
	const source = base.raw;
	return {
		...base,
		kind: "policy",
		category: (readOptionalString(source, "category") ?? "") as PolicyCategory,
		severity: readOptionalString(source, "severity") ?? "error",
		event_intent: readOptionalString(source, "event_intent") ?? "",
		runtime_script: readOptionalString(source, "runtime_script"),
		surface_mappings: readObject(
			source,
			"surface_mappings",
			base.location.metadataPath,
			diagnostics,
		),
		blocking: readBoolean(source, "blocking"),
		failure_mode: readOptionalString(source, "failure_mode") as
			| PolicyFailureMode
			| undefined,
		handler_class: readOptionalString(source, "handler_class") as
			| PolicyHandlerClass
			| undefined,
		matcher: readOptionalString(source, "matcher"),
		payload_schema: readOptionalString(source, "payload_schema"),
		surface_events: readStringArray(
			source,
			"surface_events",
			base.location.metadataPath,
			diagnostics,
		),
		test_payloads: readStringArray(
			source,
			"test_payloads",
			base.location.metadataPath,
			diagnostics,
		),
		message: readOptionalString(source, "message"),
		tests: readStringArray(
			source,
			"tests",
			base.location.metadataPath,
			diagnostics,
		),
	};
}
