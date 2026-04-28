import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const readJson = (path) =>
	JSON.parse(readFileSync(resolve(root, path), "utf8"));
const readText = (path) => readFileSync(resolve(root, path));

const checks = [
	{
		schema: "source/schema/upstream-schemas.schema.json",
		data: "source/schemas/upstream.json",
	},
	{
		schema: "source/schema/platform-config.schema.json",
		data: "source/platforms/codex/config.json",
	},
	{
		schema: "source/schema/platform-config.schema.json",
		data: "source/platforms/claude/config.json",
	},
	{
		schema: "source/schema/platform-config.schema.json",
		data: "source/platforms/opencode/config.json",
	},
	{
		schema: "source/schema/subscriptions.schema.json",
		data: "source/routes/subscriptions.json",
	},
	{
		schema: "source/schema/providers.schema.json",
		data: "source/providers/providers.json",
	},
];

for (const check of checks) {
	const ajvForCheck = new Ajv2020({ allErrors: true });
	ajvForCheck.addFormat("uri", {
		type: "string",
		validate(value) {
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
	});
	const schema = readJson(check.schema);
	const data = readJson(check.data);
	const validate = ajvForCheck.compile(schema);
	if (!validate(data)) {
		console.error(`${check.data} failed ${check.schema}`);
		console.error(JSON.stringify(validate.errors, null, 2));
		process.exit(1);
	}
}

const upstream = readJson("source/schemas/upstream.json");
for (const [id, schema] of Object.entries(upstream.schemas)) {
	const actual = createHash("sha256")
		.update(readText(schema.local_cache))
		.digest("hex");
	if (actual !== schema.sha256) {
		console.error(`${id} hash mismatch: ${actual}, expected ${schema.sha256}`);
		process.exit(1);
	}
}

const codex = readJson("source/platforms/codex/config.json");
const codexFeatures = codex.required_config.features;
if (codex.subscription.default !== "plus") {
	throw new Error("codex subscription default must be plus");
}
if (codexFeatures.fast_mode !== false) {
	throw new Error("codex features.fast_mode must be false");
}
if (codexFeatures.experimental_use_unified_exec_tool !== false) {
	throw new Error(
		"codex features.experimental_use_unified_exec_tool must be false",
	);
}
if (codex.required_config.experimental_use_unified_exec_tool !== false) {
	throw new Error("codex experimental_use_unified_exec_tool must be false");
}
if (codexFeatures.multi_agent !== false) {
	throw new Error("codex features.multi_agent must be false");
}
if (codexFeatures.multi_agent_v2 !== true) {
	throw new Error("codex features.multi_agent_v2 must be true");
}

const claude = readJson("source/platforms/claude/config.json");
if (claude.subscription.default !== "max-5") {
	throw new Error("claude subscription default must be max-5");
}
if (!claude.subscription.blocked_consumer_tiers.includes("plus")) {
	throw new Error("claude plus subscription must be blocked");
}
if (claude.required_config.disableAllHooks !== false) {
	throw new Error("claude disableAllHooks must be false");
}
if (claude.required_config.fastMode !== false) {
	throw new Error("claude fastMode must be false");
}

const providers = readJson("source/providers/providers.json").providers;
for (const [id, provider] of Object.entries(providers)) {
	if (!provider.upstream_path.endsWith("/upstream")) {
		throw new Error(`${id} upstream_path must end with /upstream`);
	}
	if (!provider.overlay_path.endsWith("/overlay")) {
		throw new Error(`${id} overlay_path must end with /overlay`);
	}
	if (
		provider.upstream_path.replace("/upstream", "") !==
		provider.overlay_path.replace("/overlay", "")
	) {
		throw new Error(
			`${id} upstream and overlay paths must share provider root`,
		);
	}
	if (
		provider.sync_mode !== "optional-cli" &&
		provider.git.sync_strategy !== "clone-fetch-checkout"
	) {
		throw new Error(`${id} git provider must use clone-fetch-checkout sync`);
	}
	if (
		!(
			provider.provenance.record_commit &&
			provider.provenance.record_branch &&
			provider.provenance.record_paths
		)
	) {
		throw new Error(`${id} provenance must record commit, branch, and paths`);
	}
}

console.log("source schemas ok");
