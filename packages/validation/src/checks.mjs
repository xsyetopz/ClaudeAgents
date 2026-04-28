import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import { loadAdapters } from "../../core/src/adapters.mjs";
import { readJson as readJsonFile } from "../../core/src/json.mjs";
import {
	assertModelPolicy,
	loadModelPolicy,
} from "../../core/src/model-policy.mjs";
import { repoPath } from "../../core/src/paths.mjs";

const schemaPairs = [
	[
		"prompts",
		"source/harness/prompts.json",
		"source/harness/schemas/list.schema.json",
	],
	[
		"skills",
		"source/harness/skills.json",
		"source/harness/schemas/list.schema.json",
	],
	[
		"commands",
		"source/harness/commands.json",
		"source/harness/schemas/list.schema.json",
	],
	[
		"hooks",
		"source/harness/hooks.json",
		"source/harness/schemas/list.schema.json",
	],
	[
		"permissions",
		"source/harness/permissions.json",
		"source/harness/schemas/permissions.schema.json",
	],
	[
		"install-targets",
		"source/harness/install-targets.json",
		"source/harness/schemas/list.schema.json",
	],
	[
		"uninstall-targets",
		"source/harness/uninstall-targets.json",
		"source/harness/schemas/uninstall-targets.schema.json",
	],
	[
		"validation-result",
		"source/harness/validation-result.json",
		"source/harness/schemas/validation-result.schema.json",
	],
	[
		"product",
		"source/harness/product.json",
		"source/harness/schemas/product.schema.json",
	],
	[
		"model-policy",
		"source/harness/model-policy.json",
		"source/harness/schemas/model-policy.schema.json",
	],
	[
		"adapters",
		"source/harness/adapters.json",
		"source/harness/schemas/adapter.schema.json",
	],
	[
		"evidence",
		"source/harness/evidence.json",
		"source/harness/schemas/evidence.schema.json",
	],
];

export function ok(id, message) {
	return { id, ok: true, message };
}

export function fail(id, message) {
	return { id, ok: false, message };
}

async function readHarnessJson(path) {
	return await readJsonFile(repoPath(path));
}

export async function checkSchemas() {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const results = [];
	for (const [id, dataPath, schemaPath] of schemaPairs) {
		const schema = await readHarnessJson(schemaPath);
		const data = await readHarnessJson(dataPath);
		const validate = ajv.compile(schema);
		if (validate(data)) {
			results.push(ok(`schema:${id}`, `${dataPath} matches ${schemaPath}`));
		} else {
			results.push(fail(`schema:${id}`, ajv.errorsText(validate.errors)));
		}
	}
	return results;
}

export async function checkModelPolicy() {
	try {
		assertModelPolicy(await loadModelPolicy());
		return [
			ok(
				"model-policy",
				"Codex utility uses gpt-5.4-mini and OpenCode fallbacks are valid",
			),
		];
	} catch (error) {
		return [fail("model-policy", error.message)];
	}
}

async function collectFiles(dir, suffix) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await collectFiles(path, suffix)));
		} else if (entry.name.endsWith(suffix)) {
			out.push(path);
		}
	}
	return out;
}

export async function checkEvidence() {
	const evidence = await readHarnessJson("source/harness/evidence.json");
	const results = [];
	for (const path of evidence.requiredPlanPaths) {
		results.push(
			existsSync(repoPath(path))
				? ok(`evidence:path:${path}`, `${path} exists`)
				: fail(`evidence:path:${path}`, `${path} missing`),
		);
	}
	const activeFiles = await collectFiles(repoPath("plans"), ".md");
	activeFiles.push(repoPath("package.json"), repoPath(".gitignore"));
	const activeText = (
		await Promise.all(activeFiles.map((path) => readFile(path, "utf8")))
	).join("\n");
	for (const term of evidence.forbiddenActiveTerms) {
		results.push(
			activeText.includes(term)
				? fail(`evidence:forbidden:${term}`, `${term} found in active files`)
				: ok(`evidence:forbidden:${term}`, `${term} absent`),
		);
	}
	for (const term of evidence.requiredTerms) {
		results.push(
			activeText.includes(term)
				? ok(`evidence:required:${term}`, `${term} found`)
				: fail(`evidence:required:${term}`, `${term} missing`),
		);
	}
	return results;
}

function parseIsoDate(value) {
	const millis = Date.parse(`${value}T00:00:00Z`);
	if (Number.isNaN(millis)) {
		throw new Error(`invalid ISO date: ${value}`);
	}
	return millis;
}

function ageInDays(verifiedAt, now) {
	const dayMillis = 24 * 60 * 60 * 1000;
	return Math.floor((parseIsoDate(now) - parseIsoDate(verifiedAt)) / dayMillis);
}

export async function checkEvidenceDates(now = "2026-04-28") {
	const evidence = await readHarnessJson("source/harness/evidence.json");
	const results = [];
	for (const item of evidence.platformEvidence) {
		const age = ageInDays(item.verifiedAt, now);
		results.push(
			age > evidence.maxAgeDays
				? fail(
						`evidence-date:${item.platformId}`,
						`${item.path} stale by ${age} days`,
					)
				: ok(
						`evidence-date:${item.platformId}`,
						`${item.path} verified ${age} days ago`,
					),
		);
	}
	return results;
}

export async function checkAdapters() {
	const adapters = await loadAdapters();
	const results = [];
	const seen = new Set();
	for (const adapter of adapters) {
		if (seen.has(adapter.id)) {
			results.push(fail(`adapter:${adapter.id}`, "duplicate adapter id"));
		} else {
			seen.add(adapter.id);
			results.push(
				ok(`adapter:${adapter.id}`, `${adapter.displayName} registered`),
			);
		}
		results.push(
			existsSync(repoPath(adapter.planPath))
				? ok(`adapter-plan:${adapter.id}`, `${adapter.planPath} exists`)
				: fail(`adapter-plan:${adapter.id}`, `${adapter.planPath} missing`),
		);
	}
	return results;
}

export async function checkRoadmap() {
	const roadmap = await readFile(repoPath("plans/013-roadmap.md"), "utf8");
	const required = [
		"Create `source/harness/`",
		"Create the `oal` CLI entrypoint",
		"Create Rust crate `oal-runner`",
		"Final Acceptance",
	];
	return required.map((term) =>
		roadmap.includes(term)
			? ok(`roadmap:${term}`, `${term} found`)
			: fail(`roadmap:${term}`, `${term} missing`),
	);
}

export async function runChecks(target = "all") {
	const groups = {
		adapters: checkAdapters,
		all: async () => [
			...(await checkSchemas()),
			...(await checkModelPolicy()),
			...(await checkEvidence()),
			...(await checkEvidenceDates()),
			...(await checkAdapters()),
			...(await checkRoadmap()),
		],
		codex: async () => [
			...(await checkSchemas()),
			...(await checkModelPolicy()),
			...(await checkEvidence()),
			...(await checkEvidenceDates()),
		],
		"evidence-dates": checkEvidenceDates,
		evidence: checkEvidence,
		"model-policy": checkModelPolicy,
		roadmap: checkRoadmap,
		schemas: checkSchemas,
	};
	const check = groups[target];
	if (!check) {
		throw new Error(`unknown check target: ${target}`);
	}
	return await check();
}

export function formatResults(results) {
	return results
		.map(
			(result) =>
				`${result.ok ? "ok" : "fail"}\t${result.id}\t${result.message}`,
		)
		.join("\n");
}

export function summarizeResults(results) {
	const failed = results.filter((result) => !result.ok);
	return {
		failed: failed.length,
		failures: failed,
		ok: failed.length === 0,
		passed: results.length - failed.length,
	};
}
