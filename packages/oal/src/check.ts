import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertRenderIdempotent } from "./render";
import {
	codexModels,
	createOalError,
	greekGodAgents,
	type JsonObject,
	loadSource,
	readTextFile,
	type SourceFile,
	type SourceGraph,
	sha256,
	sourceFiles,
	validateJsonBySchema,
} from "./source";

const schemaChecks = [
	["source/schema/oal.schema.json", "source/oal.json"],
	[
		"source/schema/upstream-schemas.schema.json",
		"source/schemas/upstream.json",
	],
	[
		"source/schema/subscriptions.schema.json",
		"source/routes/subscriptions.json",
	],
	["source/schema/model-routes.schema.json", "source/routes/models.json"],
	["source/schema/providers.schema.json", "source/providers/providers.json"],
	["source/schema/tools.schema.json", "source/tools/tools.json"],
] as const;

const platformIds = ["codex", "claude", "opencode"] as const;

export function checkSource(root = process.cwd()): void {
	for (const [schema, data] of schemaChecks) {
		validateJsonBySchema(root, schema, data);
	}
	for (const agent of readdirSync(resolve(root, "source/agents")).sort()) {
		validateJsonBySchema(
			root,
			"source/schema/agent.schema.json",
			`source/agents/${agent}`,
		);
	}
	for (const hook of readdirSync(resolve(root, "source/hooks")).sort()) {
		validateJsonBySchema(
			root,
			"source/schema/hook.schema.json",
			`source/hooks/${hook}`,
		);
	}
	for (const platform of platformIds) {
		validateJsonBySchema(
			root,
			"source/schema/platform.schema.json",
			`source/platforms/${platform}/platform.json`,
		);
		validateJsonBySchema(
			root,
			"source/schema/platform-config.schema.json",
			`source/platforms/${platform}/config.json`,
		);
	}
	const graph = loadSource(root);
	checkNoGeneratedSource(graph);
	checkRootReferences(graph);
	checkAgents(graph);
	checkHooks(graph);
	checkUpstreamHashes(root, graph);
	checkModelRoutes(graph);
	checkSubscriptions(graph);
	checkPlatformPolicies(graph);
	checkProviders(graph);
	checkTools(graph);
	assertRenderIdempotent(root);
}

function checkNoGeneratedSource(graph: SourceGraph): void {
	for (const file of sourceFiles(graph)) {
		if (file.path.startsWith("generated/")) {
			throw createOalError(
				file.path,
				"/",
				"generated output cannot be source input",
				file.path,
				"source/**",
			);
		}
	}
}

function checkRootReferences(graph: SourceGraph): void {
	const root = graph.root.data;
	checkListExists(
		root,
		"platforms",
		graph.platforms.map((file) => String(file.data["id"])),
		graph.root.path,
	);
	checkListExists(
		root,
		"providers",
		Object.keys(providerRecords(graph)),
		graph.root.path,
	);
	checkListExists(root, "routes", ["subscriptions", "models"], graph.root.path);
	checkListExists(
		root,
		"tools",
		Object.keys(toolRecords(graph)),
		graph.root.path,
	);
}

function checkListExists(
	root: JsonObject,
	key: string,
	available: string[],
	file: string,
): void {
	for (const value of root[key] as string[]) {
		if (!available.includes(value)) {
			throw createOalError(
				file,
				`/${key}`,
				`${key} references missing source record`,
				value,
				available,
			);
		}
	}
}

function checkAgents(graph: SourceGraph): void {
	const ids = graph.agents.map((agent) => String(agent.data["id"])).sort();
	const required = [...greekGodAgents].sort();
	if (JSON.stringify(ids) !== JSON.stringify(required)) {
		throw createOalError(
			"source/agents",
			"/",
			"Greek-gods agent set mismatch",
			ids,
			required,
		);
	}
}

function checkHooks(graph: SourceGraph): void {
	for (const hook of graph.hooks) {
		const id = String(hook.data["id"]);
		const category = String(hook.data["category"]);
		if (!id.startsWith(`${category}-`)) {
			throw createOalError(
				hook.path,
				"/id",
				"hook id must start with hook category prefix",
				id,
				`${category}-*`,
			);
		}
	}
}

function checkUpstreamHashes(root: string, graph: SourceGraph): void {
	for (const [id, schema] of Object.entries(upstreamSchemas(graph))) {
		const schemaRecord = schema as JsonObject;
		const actual = sha256(
			readTextFile(root, String(schemaRecord["local_cache"])),
		);
		if (actual !== schemaRecord["sha256"]) {
			throw createOalError(
				graph.upstreamSchemas.path,
				`/schemas/${id}/sha256`,
				"upstream schema hash mismatch",
				actual,
				schemaRecord["sha256"],
			);
		}
	}
}

function checkModelRoutes(graph: SourceGraph): void {
	const models = graph.modelRoutes.data;
	checkRoutesInAllowedSet(
		graph.modelRoutes.path,
		"/codex",
		models["codex"] as JsonObject,
		[...codexModels],
	);
	checkRoutesInAllowedSet(
		graph.modelRoutes.path,
		"/claude",
		models["claude"] as JsonObject,
		["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
	);
	checkRoutesInAllowedSet(
		graph.modelRoutes.path,
		"/opencode",
		models["opencode"] as JsonObject,
		[
			"opencode/big-pickle",
			"opencode/minimax-m2.5-free",
			"opencode/hy3-preview-free",
			"opencode/ling-2.6-flash-free",
			"opencode/nemotron-3-super-free",
		],
	);
}

function checkRoutesInAllowedSet(
	file: string,
	jsonPath: string,
	record: JsonObject,
	requiredAllowed: string[],
): void {
	const allowed = record["allowed_models"] as string[];
	for (const required of requiredAllowed) {
		if (!allowed.includes(required)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed_models`,
				"required model id missing",
				allowed,
				required,
			);
		}
	}
	for (const model of allowed) {
		if (!requiredAllowed.includes(model)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed_models`,
				"allowed model set contains unsupported model id",
				model,
				requiredAllowed,
			);
		}
	}
	for (const [route, model] of Object.entries(record["routes"] as JsonObject)) {
		if (!allowed.includes(String(model))) {
			throw createOalError(
				file,
				`${jsonPath}/routes/${route}`,
				"route uses unsupported model id",
				model,
				allowed,
			);
		}
	}
}

function checkSubscriptions(graph: SourceGraph): void {
	const subscriptions = graph.subscriptions.data;
	checkAllowedSubscription(
		graph.subscriptions.path,
		"/codex",
		subscriptions["codex"] as JsonObject,
		["plus", "pro-5", "pro-20"],
	);
	checkAllowedSubscription(
		graph.subscriptions.path,
		"/claude",
		subscriptions["claude"] as JsonObject,
		["max-5", "max-20"],
	);
	const claude = subscriptions["claude"] as JsonObject;
	if (!(claude["blocked"] as string[]).includes("plus")) {
		throw createOalError(
			graph.subscriptions.path,
			"/claude/blocked",
			"Claude Code plus consumer profile must be blocked",
			claude["blocked"],
			"plus",
		);
	}
}

function checkAllowedSubscription(
	file: string,
	jsonPath: string,
	record: JsonObject,
	requiredAllowed: string[],
): void {
	const allowed = record["allowed"] as string[];
	if (!allowed.includes(String(record["default"]))) {
		throw createOalError(
			file,
			`${jsonPath}/default`,
			"subscription default outside allowed set",
			record["default"],
			allowed,
		);
	}
	for (const required of requiredAllowed) {
		if (!allowed.includes(required)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed`,
				"required subscription missing",
				allowed,
				required,
			);
		}
	}
	for (const tier of allowed) {
		if (!requiredAllowed.includes(tier)) {
			throw createOalError(
				file,
				`${jsonPath}/allowed`,
				"subscription allowed set contains unsupported tier",
				tier,
				requiredAllowed,
			);
		}
	}
}

function checkPlatformPolicies(graph: SourceGraph): void {
	const codex = configFor(graph, "codex");
	const codexFeatures = (codex.data["required_config"] as JsonObject)[
		"features"
	] as JsonObject;
	checkRequired(
		codex.path,
		"/subscription/default",
		(codex.data["subscription"] as JsonObject)["default"],
		"plus",
	);
	checkRequired(
		codex.path,
		"/required_config/features/fast_mode",
		codexFeatures["fast_mode"],
		false,
	);
	checkRequired(
		codex.path,
		"/required_config/features/experimental_use_unified_exec_tool",
		codexFeatures["experimental_use_unified_exec_tool"],
		false,
	);
	checkRequired(
		codex.path,
		"/required_config/experimental_use_unified_exec_tool",
		(codex.data["required_config"] as JsonObject)[
			"experimental_use_unified_exec_tool"
		],
		false,
	);
	checkRequired(
		codex.path,
		"/required_config/features/multi_agent",
		codexFeatures["multi_agent"],
		false,
	);
	checkRequired(
		codex.path,
		"/required_config/features/multi_agent_v2",
		codexFeatures["multi_agent_v2"],
		true,
	);

	const claude = configFor(graph, "claude");
	checkRequired(
		claude.path,
		"/subscription/default",
		(claude.data["subscription"] as JsonObject)["default"],
		"max-5",
	);
	checkRequired(
		claude.path,
		"/required_config/disableAllHooks",
		(claude.data["required_config"] as JsonObject)["disableAllHooks"],
		false,
	);
	checkRequired(
		claude.path,
		"/required_config/fastMode",
		(claude.data["required_config"] as JsonObject)["fastMode"],
		false,
	);
	checkRequired(
		claude.path,
		"/required_config/fastModePerSessionOptIn",
		(claude.data["required_config"] as JsonObject)["fastModePerSessionOptIn"],
		false,
	);

	const opencode = configFor(graph, "opencode");
	if (
		!greekGodAgents.includes(
			(opencode.data["required_config"] as JsonObject)[
				"default_agent"
			] as (typeof greekGodAgents)[number],
		)
	) {
		throw createOalError(
			opencode.path,
			"/required_config/default_agent",
			"OpenCode default_agent must be Greek-gods agent",
			(opencode.data["required_config"] as JsonObject)["default_agent"],
			greekGodAgents,
		);
	}
}

function checkRequired(
	file: string,
	jsonPath: string,
	actual: unknown,
	required: unknown,
): void {
	if (actual !== required) {
		throw createOalError(
			file,
			jsonPath,
			"required policy value mismatch",
			actual,
			required,
		);
	}
}

function checkProviders(graph: SourceGraph): void {
	for (const [id, provider] of Object.entries(providerRecords(graph))) {
		const record = provider as JsonObject;
		for (const field of ["repo_url", "branch", "locked_ref"]) {
			if (!(record["git"] as JsonObject)[field]) {
				throw createOalError(
					graph.providers.path,
					`/providers/${id}/git/${field}`,
					"git-backed provider missing required provenance field",
					(record["git"] as JsonObject)[field],
					"non-empty string",
				);
			}
		}
		if (!String(record["upstream_path"]).endsWith("/upstream")) {
			throw createOalError(
				graph.providers.path,
				`/providers/${id}/upstream_path`,
				"provider upstream path must end with /upstream",
				record["upstream_path"],
				"providers/<id>/upstream",
			);
		}
		if (!String(record["overlay_path"]).endsWith("/overlay")) {
			throw createOalError(
				graph.providers.path,
				`/providers/${id}/overlay_path`,
				"provider overlay path must end with /overlay",
				record["overlay_path"],
				"providers/<id>/overlay",
			);
		}
		if (
			String(record["sync_mode"]) !== "optional-cli" &&
			(record["git"] as JsonObject)["sync_strategy"] !== "clone-fetch-checkout"
		) {
			throw createOalError(
				graph.providers.path,
				`/providers/${id}/git/sync_strategy`,
				"required git provider must use clone-fetch-checkout sync",
				(record["git"] as JsonObject)["sync_strategy"],
				"clone-fetch-checkout",
			);
		}
		const provenance = record["provenance"] as JsonObject;
		for (const field of ["record_commit", "record_branch", "record_paths"]) {
			if (provenance[field] !== true) {
				throw createOalError(
					graph.providers.path,
					`/providers/${id}/provenance/${field}`,
					"provider provenance flag must be true",
					provenance[field],
					true,
				);
			}
		}
	}
}

function checkTools(graph: SourceGraph): void {
	for (const [id, tool] of Object.entries(toolRecords(graph))) {
		const install = (tool as JsonObject)["install"] as JsonObject;
		if (!install["linux"]) {
			throw createOalError(
				graph.tools.path,
				`/tools/${id}/install/linux`,
				"Linux tool install record must name package-manager detection",
				install["linux"],
				"package-manager or upstream-script",
			);
		}
	}
}

function providerRecords(graph: SourceGraph): JsonObject {
	return graph.providers.data["providers"] as JsonObject;
}

function toolRecords(graph: SourceGraph): JsonObject {
	return graph.tools.data["tools"] as JsonObject;
}

function upstreamSchemas(graph: SourceGraph): JsonObject {
	return graph.upstreamSchemas.data["schemas"] as JsonObject;
}

function configFor(graph: SourceGraph, platform: string): SourceFile {
	const config = graph.platformConfigs.find(
		(file) => file.data["platform"] === platform,
	);
	if (!config) {
		throw createOalError(
			"source/platforms",
			"/",
			"platform config missing",
			platform,
			"source/platforms/<platform>/config.json",
		);
	}
	return config;
}
