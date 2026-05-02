import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createSourceGraph, type SourceGraph } from "./graph";
import { readJson, readRecords } from "./read";
import type {
	AgentRecord,
	HookRecord,
	OalSource,
	ProductSource,
	RouteRecord,
	SkillRecord,
	ToolRecord,
} from "./records";
import {
	validateAgentRecord,
	validateHookRecord,
	validateProductSource,
	validateRouteRecord,
	validateSkillRecord,
	validateSkillRecordShape,
	validateToolRecord,
} from "./validate";

export async function loadSource(sourceRoot: string): Promise<SourceGraph> {
	const product = await readJson<ProductSource>(
		join(sourceRoot, "product.json"),
	);
	validateProductSource(product);
	const source: OalSource = {
		...product,
		agents: await readRecords<AgentRecord>(
			sourceRoot,
			"agents",
			validateAgentRecord,
		),
		skills: await loadSkillRecords(sourceRoot),
		routes: await readRecords<RouteRecord>(
			sourceRoot,
			"routes",
			validateRouteRecord,
		),
		hooks: await readRecords<HookRecord>(
			sourceRoot,
			"hooks",
			validateHookRecord,
		),
		tools: await readRecords<ToolRecord>(
			sourceRoot,
			"tools",
			validateToolRecord,
		),
	};
	return createSourceGraph(sourceRoot, source);
}

async function loadSkillRecords(sourceRoot: string): Promise<SkillRecord[]> {
	const records = await readRecords<SkillRecord>(
		sourceRoot,
		"skills",
		validateSkillRecordShape,
	);
	const hydrated = await Promise.all(
		records.map((record) => hydrateUpstreamSkill(sourceRoot, record)),
	);
	for (const record of hydrated) validateSkillRecord(record);
	return hydrated;
}

async function hydrateUpstreamSkill(
	sourceRoot: string,
	record: SkillRecord,
): Promise<SkillRecord> {
	if (!record.upstream) return record;
	const upstreamPath = join(sourceRoot, "..", record.upstream.path);
	return {
		...record,
		body: await readFile(upstreamPath, "utf8"),
	};
}
