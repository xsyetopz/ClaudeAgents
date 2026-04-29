import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { validateHookMappings } from "../hook-mappings";
import { composeAgentPrompt } from "../prompts";
import type { JsonObject, SourceFile, SourceGraph } from "../source";
import { OalError, readJsonFile, stableStringify } from "../source";
import {
	asJsonObject,
	type CapabilityReport,
	type DetectResult,
	type DoctorResult,
	type PlatformAdapter,
	type RenderedPayload,
	statusMap,
} from "./types";

export const opencodeAdapter: PlatformAdapter = {
	capabilities(graph: SourceGraph): CapabilityReport {
		const platform = platformFor(graph);
		const surfaces = statusMap(platform.data["native_surfaces"] as string[]);
		surfaces["commands"] = "manual";
		surfaces["config"] = "supported";
		surfaces["hooks"] = "unsupported";
		surfaces["mcp"] = "manual";
		surfaces["model_routes"] = "supported";
		return {
			platform: "opencode",
			surfaces,
		};
	},
	detect(root: string, graph: SourceGraph): DetectResult {
		const config = configFor(graph);
		return {
			available: Boolean(Bun.which(String(config.data["binary"]))),
			binary: String(config.data["binary"]),
			config_root: "~/.config/opencode",
			platform: "opencode",
			project_root: existsSync(root) ? root : resolve(root),
		};
	},
	doctorHooks(_root: string, graph: SourceGraph): DoctorResult {
		const platformEvents = asJsonObject(
			graph.hookEvents.data["platform_events"],
		);
		const checks = graph.hooks.flatMap((hook) =>
			validateHookMappings(hook, graph.hookEvents, Object.keys(platformEvents)),
		);
		return {
			checks,
			ok: checks.every((check) => check.ok),
			platform: "opencode",
		};
	},
	id: "opencode",
	render(root: string, graph: SourceGraph): RenderedPayload[] {
		const config = configFor(graph);
		const opencodeConfig = opencodeConfigObject(graph, config);
		validateOpencodeConfig(
			root,
			opencodeConfig,
			"generated/opencode/opencode.json",
			config.path,
			opencodeConfigSchemaUrl(graph),
		);
		return [
			{
				content: `${JSON.stringify(opencodeConfig, null, "\t")}\n`,
				path: "opencode/opencode.json",
				sourcePaths: [
					config.path,
					graph.modelRoutes.path,
					...graph.agents.map((agent) => agent.path),
				],
			},
			...graph.agents.map((agent) => ({
				content: renderOpenCodeAgent(graph, agent),
				path: `opencode/.opencode/agents/${agent.data["id"]}.md`,
				sourcePaths: [
					agent.path,
					String(agent.data["prompt_path"]),
					config.path,
					graph.modelRoutes.path,
					...graph.promptModules.map((module) => module.path),
				],
			})),
			...graph.skills.map((skill) => ({
				content: renderOpenCodeSkill(graph, skill),
				path: `opencode/.opencode/skills/${skill.data["id"]}/SKILL.md`,
				sourcePaths: [skill.path, String(skill.data["body_path"])],
			})),
		];
	},
};

function renderOpenCodeAgent(graph: SourceGraph, agent: SourceFile): string {
	return [
		"---",
		`description: ${String(agent.data["role"])}`,
		"mode: subagent",
		`model: ${opencodeModelFor(graph, agent)}`,
		"permission: ask",
		"---",
		"",
		composeAgentPrompt(graph, agent, "OpenCode"),
		"",
	].join("\n");
}

function renderOpenCodeSkill(graph: SourceGraph, skill: SourceFile): string {
	return [
		"---",
		`name: ${skill.data["id"]}`,
		`description: ${String(skill.data["description"]).replaceAll("\n", " ")}`,
		"---",
		"",
		skillBodyFor(graph, skill).data.trim(),
		"",
	].join("\n");
}

function skillBodyFor(
	graph: SourceGraph,
	skill: SourceFile,
): SourceFile<string> {
	const bodyPath = String(skill.data["body_path"]);
	const body = graph.skillBodies.find((file) => file.path === bodyPath);
	if (!body) {
		throw new Error(`${bodyPath} is required`);
	}
	return body;
}

function opencodeConfigObject(
	graph: SourceGraph,
	config: SourceFile,
): JsonObject {
	return {
		$schema: opencodeConfigSchemaUrl(graph),
		...asJsonObject(config.data["required_config"]),
		agent: Object.fromEntries(
			graph.agents.map((agent) => [
				String(agent.data["id"]),
				{
					description: String(agent.data["role"]),
					mode: "subagent",
					model: opencodeModelFor(graph, agent),
					permission: "ask",
				},
			]),
		),
		permission: {
			bash: "ask",
			edit: "ask",
			read: "allow",
		},
		skills: {
			paths: [".opencode/skills"],
		},
	};
}

function opencodeModelFor(graph: SourceGraph, agent: SourceFile): string {
	const route = String(agent.data["model_route"]);
	const routes = asJsonObject(
		asJsonObject(graph.modelRoutes.data["opencode"])["routes"],
	);
	return String(routes[route] ?? routes["utility"]);
}

function configFor(graph: SourceGraph): SourceFile {
	const config = graph.platformConfigs.find(
		(file) => file.data["platform"] === "opencode",
	);
	if (!config) {
		throw new Error("source/platforms/opencode/config.json is required");
	}
	return config;
}

function platformFor(graph: SourceGraph): SourceFile {
	const platform = graph.platforms.find(
		(file) => file.data["id"] === "opencode",
	);
	if (!platform) {
		throw new Error("source/platforms/opencode/platform.json is required");
	}
	return platform;
}

function opencodeConfigSchemaUrl(graph: SourceGraph): string {
	const schemas = asJsonObject(graph.upstreamSchemas.data["schemas"]);
	const opencodeConfig = asJsonObject(schemas["opencode_config"]);
	return String(opencodeConfig["url"]);
}

function validateOpencodeConfig(
	root: string,
	config: JsonObject,
	generatedPath: string,
	sourcePath: string,
	schemaUrl: string,
): void {
	const schema = readJsonFile(
		root,
		"source/schemas/cache/opencode-config.schema.json",
	);
	const validate = new Ajv2020({
		allErrors: true,
		logger: false,
		strict: false,
	})
		.addSchema(
			{
				$id: "https://models.dev/model-schema.json",
				$defs: {
					Model: {
						type: "string",
					},
				},
			},
			"https://models.dev/model-schema.json",
		)
		.compile(schema);
	if (!validate(config)) {
		throw new OalError(`${generatedPath} failed opencode_config`, [
			...(validate.errors ?? []).map((error) => ({
				badValue: valueAtJsonPath(config, error.instancePath),
				file: generatedPath,
				generatedFile: generatedPath,
				jsonPath: error.instancePath || "/",
				message: error.message ?? "opencode config schema rule failed",
				platform: "opencode",
				requiredValue: error.params,
				schemaUrl,
				sourceFile: sourcePath,
			})),
		]);
	}
}

function valueAtJsonPath(value: unknown, jsonPath: string): unknown {
	if (!jsonPath) {
		return value;
	}
	let current = value;
	for (const rawPart of jsonPath.split("/").slice(1)) {
		if (!current || typeof current !== "object") {
			return undefined;
		}
		const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
		current = (current as JsonObject)[part];
	}
	return current;
}

export function opencodeConfigJsonForTest(graph: SourceGraph): string {
	return stableStringify(opencodeConfigObject(graph, configFor(graph)));
}
