import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import type { JsonObject, SourceFile, SourceGraph } from "../source";
import { readJsonFile, stableStringify } from "../source";
import {
	asJsonObject,
	type CapabilityReport,
	type DetectResult,
	type DoctorResult,
	jsonPayload,
	type PlatformAdapter,
	type RenderedPayload,
	statusMap,
} from "./types";

export const codexAdapter: PlatformAdapter = {
	capabilities(graph: SourceGraph): CapabilityReport {
		const platform = platformFor(graph);
		const surfaces = statusMap(platform.data["native_surfaces"] as string[]);
		surfaces["mcp"] = "manual";
		surfaces["model_routes"] = "manual";
		return {
			platform: "codex",
			surfaces,
		};
	},
	detect(root: string, graph: SourceGraph): DetectResult {
		const config = configFor(graph);
		return {
			available: Boolean(Bun.which(String(config.data["binary"]))),
			binary: String(config.data["binary"]),
			config_root: "~/.codex",
			platform: "codex",
			project_root: existsSync(root) ? root : resolve(root),
		};
	},
	doctorHooks(_root: string, graph: SourceGraph): DoctorResult {
		const checks = graph.hooks.map((hook) => {
			const supported = asJsonObject(hook.data["supported_platforms"]);
			const unsupported = asJsonObject(hook.data["unsupported_platforms"]);
			if (supported["codex"]) {
				return {
					message: `${hook.data["id"]}: codex hook mapping supported`,
					ok: true,
					path: hook.path,
				};
			}
			return {
				message: `${hook.data["id"]}: codex unsupported: ${String(unsupported["codex"] ?? "missing reason")}`,
				ok: Boolean(unsupported["codex"]),
				path: hook.path,
			};
		});
		return {
			checks,
			ok: checks.every((check) => check.ok),
			platform: "codex",
		};
	},
	id: "codex",
	render(root: string, graph: SourceGraph): RenderedPayload[] {
		const config = configFor(graph);
		const configObject = codexConfigObject(config);
		validateCodexConfig(root, configObject);
		return [
			{
				content: renderAgentsMd(graph),
				path: "codex/AGENTS.md",
				sourcePaths: [
					"source/oal.json",
					...graph.agents.map((agent) => agent.path),
				],
			},
			...graph.agents.map((agent) =>
				jsonPayload(`codex/agents/${agent.data["id"]}.json`, agent.data, [
					agent.path,
				]),
			),
			jsonPayload(
				"codex/skills/README.json",
				{
					note: "No Codex skills are sourced in this wave.",
					platform: "codex",
				},
				["source/oal.json"],
			),
			...graph.hooks
				.filter((hook) =>
					Boolean(asJsonObject(hook.data["supported_platforms"])["codex"]),
				)
				.map((hook) =>
					jsonPayload(`codex/hooks/${hook.data["id"]}.json`, hook.data, [
						hook.path,
					]),
				),
			{
				content: toToml(configObject),
				path: "codex/config.toml",
				sourcePaths: [config.path],
			},
		];
	},
};

function configFor(graph: SourceGraph): SourceFile {
	const config = graph.platformConfigs.find(
		(file) => file.data["platform"] === "codex",
	);
	if (!config) {
		throw new Error("source/platforms/codex/config.json is required");
	}
	return config;
}

function platformFor(graph: SourceGraph): SourceFile {
	const platform = graph.platforms.find((file) => file.data["id"] === "codex");
	if (!platform) {
		throw new Error("source/platforms/codex/platform.json is required");
	}
	return platform;
}

function codexConfigObject(config: SourceFile): JsonObject {
	return asJsonObject(config.data["required_config"]);
}

function validateCodexConfig(root: string, config: JsonObject): void {
	const schema = readJsonFile(
		root,
		"source/schemas/cache/codex-config-schema.json",
	);
	const validate = new Ajv({
		allErrors: true,
		logger: false,
		strict: false,
	}).compile(schema);
	if (!validate(config)) {
		throw new Error(
			`generated/codex/config.toml failed codex_config: ${JSON.stringify(validate.errors)}`,
		);
	}
}

function renderAgentsMd(graph: SourceGraph): string {
	const lines = [
		"# OpenAgentLayer Codex instructions",
		"",
		"Generated from OAL source. Do not edit generated output by hand.",
		"",
		"## Agents",
		"",
		...graph.agents.flatMap((agent) => [
			`### ${agent.data["display_name"]}`,
			"",
			`- id: \`${agent.data["id"]}\``,
			`- route: \`${agent.data["model_route"]}\``,
			`- role: ${agent.data["role"]}`,
			"",
		]),
	];
	return `${lines.join("\n")}\n`;
}

function toToml(value: JsonObject): string {
	const lines: string[] = [];
	writeTomlObject(lines, value, []);
	return `${lines.join("\n")}\n`;
}

function writeTomlObject(
	lines: string[],
	value: JsonObject,
	path: string[],
): void {
	for (const key of Object.keys(value).sort()) {
		const item = value[key];
		if (item && typeof item === "object" && !Array.isArray(item)) {
			if (lines.length > 0) {
				lines.push("");
			}
			lines.push(`[${[...path, key].join(".")}]`);
			writeTomlObject(lines, item as JsonObject, [...path, key]);
		} else {
			lines.push(`${key} = ${formatTomlValue(item)}`);
		}
	}
}

function formatTomlValue(value: unknown): string {
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(formatTomlValue).join(", ")}]`;
	}
	return JSON.stringify(String(value));
}

export function codexConfigJsonForTest(graph: SourceGraph): string {
	return stableStringify(codexConfigObject(configFor(graph)));
}
