import { basename } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceRecord } from "@openagentlayer/types";
import {
	AGENT_MODE_SET,
	POLICY_CATEGORY_SET,
	POLICY_FAILURE_MODE_SET,
	POLICY_HANDLER_CLASS_SET,
	ROUTE_KIND_SET,
} from "./identity";
import { isKnownEffort, isKnownModelId, validateModelPlan } from "./models";
import { validateSurfaceConfig } from "./surface-config";

export function validateRecordFields(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	validateRouteContract(record, diagnostics);
	validateModelPolicy(record, diagnostics);
	validateModelPlan(record, diagnostics);
	validateSurfaceConfig(record, diagnostics);

	if (record.kind === "agent" && !AGENT_MODE_SET.has(record.mode)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-agent-mode",
				`Unknown agent mode '${record.mode}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.kind === "agent" && record.handoff_contract === undefined) {
		diagnostics.push(
			errorDiagnostic(
				"missing-handoff-contract",
				`Agent '${record.id}' must define a handoff contract.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.kind === "agent" &&
		record.effort_ceiling !== undefined &&
		!isKnownEffort(record.effort_ceiling)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-effort",
				`Unknown effort ceiling '${record.effort_ceiling}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.kind === "policy") {
		validatePolicyRecordFields(record, diagnostics);
	}

	if (record.kind === "skill") {
		validateSkillRecordFields(record, diagnostics);
	}
}

const AGENT_SKILL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_AGENT_SKILL_ID_LENGTH = 64;
const MAX_AGENT_SKILL_DESCRIPTION_LENGTH = 1_024;
const MAX_AGENT_SKILL_COMPATIBILITY_LENGTH = 500;
const PLACEHOLDER_BODY_PATTERN =
	/(^|\n)\s*(TODO|FIXME|\.\.\.|…)\s*($|\n)|rest follows|similar to above|add more as needed/iu;
const FRONTMATTER_PATTERN = /^---\n[\s\S]*?\n---\n?/u;
const NUMBERED_LIST_PATTERN = /^\d+\.\s/u;

function validateSkillRecordFields(
	record: Extract<SourceRecord, { readonly kind: "skill" }>,
	diagnostics: Diagnostic[],
): void {
	if (
		record.id.length > MAX_AGENT_SKILL_ID_LENGTH ||
		!AGENT_SKILL_ID_PATTERN.test(record.id)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-agent-skill-name",
				`Skill id '${record.id}' must be a lowercase kebab-case Agent Skills name.`,
				record.location.metadataPath,
			),
		);
	}

	if (basename(record.location.directory) !== record.id) {
		diagnostics.push(
			errorDiagnostic(
				"skill-directory-mismatch",
				`Skill directory name must match skill id '${record.id}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (record.description.length > MAX_AGENT_SKILL_DESCRIPTION_LENGTH) {
		diagnostics.push(
			errorDiagnostic(
				"agent-skill-description-too-long",
				`Skill '${record.id}' description exceeds ${MAX_AGENT_SKILL_DESCRIPTION_LENGTH} characters.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.compatibility !== undefined &&
		record.compatibility.length > MAX_AGENT_SKILL_COMPATIBILITY_LENGTH
	) {
		diagnostics.push(
			errorDiagnostic(
				"agent-skill-compatibility-too-long",
				`Skill '${record.id}' compatibility exceeds ${MAX_AGENT_SKILL_COMPATIBILITY_LENGTH} characters.`,
				record.location.metadataPath,
			),
		);
	}

	validateSkillBody(record, diagnostics);
}

function validateSkillBody(
	record: Extract<SourceRecord, { readonly kind: "skill" }>,
	diagnostics: Diagnostic[],
): void {
	const bodyWithoutFrontmatter = record.body_content
		.replace(FRONTMATTER_PATTERN, "")
		.trim();
	const bodyLines = bodyWithoutFrontmatter
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
	const hasProceduralStructure = bodyLines.some(
		(line) =>
			line.startsWith("- ") ||
			line.startsWith("* ") ||
			NUMBERED_LIST_PATTERN.test(line) ||
			line.startsWith("## "),
	);

	if (bodyLines.length < 2 || !hasProceduralStructure) {
		diagnostics.push(
			errorDiagnostic(
				"barebones-skill-body",
				`Skill '${record.id}' must include procedural guidance beyond a heading or one-line summary.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}

	if (PLACEHOLDER_BODY_PATTERN.test(record.body_content)) {
		diagnostics.push(
			errorDiagnostic(
				"placeholder-skill-body",
				`Skill '${record.id}' body contains placeholder text.`,
				record.location.bodyPath ?? record.location.metadataPath,
			),
		);
	}
}

function validatePolicyRecordFields(
	record: Extract<SourceRecord, { readonly kind: "policy" }>,
	diagnostics: Diagnostic[],
): void {
	if (!POLICY_CATEGORY_SET.has(record.category)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-policy-category",
				`Unknown policy category '${record.category}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.failure_mode !== undefined &&
		!POLICY_FAILURE_MODE_SET.has(record.failure_mode)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-failure-mode",
				`Unknown failure mode '${record.failure_mode}'.`,
				record.location.metadataPath,
			),
		);
	}

	if (
		record.handler_class !== undefined &&
		!POLICY_HANDLER_CLASS_SET.has(record.handler_class)
	) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-handler-class",
				`Unknown handler class '${record.handler_class}'.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateRouteContract(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	const routeContract =
		record.kind === "agent" ||
		record.kind === "skill" ||
		record.kind === "command"
			? record.route_contract
			: undefined;
	if (routeContract !== undefined && !ROUTE_KIND_SET.has(routeContract)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-route-contract",
				`Unknown route contract '${routeContract}'.`,
				record.location.metadataPath,
			),
		);
	}
}

function validateModelPolicy(
	record: SourceRecord,
	diagnostics: Diagnostic[],
): void {
	const modelPolicy =
		record.kind === "skill" || record.kind === "command"
			? record.model_policy
			: undefined;
	if (modelPolicy !== undefined && !isKnownModelId(modelPolicy)) {
		diagnostics.push(
			errorDiagnostic(
				"invalid-model-policy",
				`Unknown model policy '${modelPolicy}'.`,
				record.location.metadataPath,
			),
		);
	}
}
