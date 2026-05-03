import { readFile } from "node:fs/promises";
import type { Artifact } from "@openagentlayer/artifact";
import type { AnySchema } from "ajv";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";

const SCHEMA_ROOT = new URL("./schemas/", import.meta.url);
const MODEL_SCHEMA_ID = "https://models.dev/model-schema.json";

export async function validateProviderConfigArtifacts(
	artifacts: readonly Artifact[],
): Promise<void> {
	const [codexSchema, claudeSchema, openCodeSchema] = await Promise.all([
		readSchema("codex-config.schema.json"),
		readSchema("claude-code-settings.schema.json"),
		readSchema("opencode-config.schema.json"),
	]);
	const codex = new Ajv({
		allErrors: true,
		strict: false,
		validateFormats: false,
	});
	const json = new Ajv({
		allErrors: true,
		strict: false,
		validateFormats: false,
	});
	const json2020 = new Ajv2020({
		allErrors: true,
		strict: false,
		validateFormats: false,
	});
	json2020.addSchema(looseModelSchema(), MODEL_SCHEMA_ID);
	const validateCodex = codex.compile(codexSchema);
	const validateClaude = json.compile(claudeSchema);
	const validateOpenCode = json2020.compile(openCodeSchema);
	for (const artifact of artifacts) {
		if (artifact.provider === "codex" && artifact.path.endsWith(".toml"))
			assertValid(
				artifact.path,
				validateSync(validateCodex(Bun.TOML.parse(artifact.content))),
				validateCodex.errors,
			);
		if (artifact.path === ".claude/settings.json")
			assertValid(
				artifact.path,
				validateSync(validateClaude(JSON.parse(artifact.content))),
				validateClaude.errors,
			);
		if (artifact.path === "opencode.jsonc")
			assertValid(
				artifact.path,
				validateSync(
					validateOpenCode(JSON.parse(stripJsonComments(artifact.content))),
				),
				validateOpenCode.errors,
			);
	}
}

function stripJsonComments(content: string): string {
	return content
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

async function readSchema(name: string): Promise<AnySchema> {
	return JSON.parse(
		await readFile(new URL(name, SCHEMA_ROOT), "utf8"),
	) as AnySchema;
}

function looseModelSchema(): object {
	return {
		$id: MODEL_SCHEMA_ID,
		$schema: "https://json-schema.org/draft/2020-12/schema",
		$defs: {
			Model: { type: "string" },
		},
	};
}

function validateSync(valid: boolean | Promise<unknown>): boolean {
	if (typeof valid === "boolean") return valid;
	throw new Error(
		"Generated provider config schema uses unsupported async validation.",
	);
}

function assertValid(
	path: string,
	valid: boolean,
	errors:
		| null
		| undefined
		| readonly { instancePath?: string; message?: string }[],
): void {
	if (valid) return;
	const summary = (errors ?? [])
		.slice(0, 6)
		.map(
			(error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`,
		)
		.join("; ");
	throw new Error(
		`Generated provider config ${path} failed schema validation: ${summary}`,
	);
}
