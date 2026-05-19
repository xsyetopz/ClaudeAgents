import { readFile } from "node:fs/promises";
import path from "node:path";
import { hashFile } from "lifecycle";
import {
	FIRST_PARTY_RESOURCE_METADATA,
	type OlympiResourceMetadata,
	type ResourceValidationFinding,
	type ResourceValidationReport,
} from "./schema.js";

export async function validateResources(
	inputPath?: string,
): Promise<ResourceValidationReport> {
	const resources =
		inputPath === undefined
			? FIRST_PARTY_RESOURCE_METADATA
			: await readResourceFile(inputPath);
	const findings = await validateResourceSet(resources, inputPath);
	return {
		schemaVersion: 1,
		command: "resources validate",
		valid: findings.every((finding) => finding.level !== "error"),
		resourceCount: resources.length,
		resources,
		findings,
	};
}

export async function validateResourceSet(
	resources: OlympiResourceMetadata[],
	basePath?: string,
): Promise<ResourceValidationFinding[]> {
	const findings: ResourceValidationFinding[] = [];
	const commands = new Map<string, string>();
	for (const resource of resources) {
		findings.push(...validateMetadata(resource));
		for (const command of resource.commands) {
			const owner = commands.get(command);
			if (owner !== undefined && owner !== resource.name) {
				findings.push({
					level: "error",
					message: `command collision detected: ${command}`,
					resource: resource.name,
				});
			}
			commands.set(command, resource.name);
		}
		if (basePath !== undefined)
			findings.push(...(await validateSupportFiles(resource, basePath)));
	}
	return findings.sort((left, right) =>
		`${left.level}:${left.resource ?? ""}:${left.message}`.localeCompare(
			`${right.level}:${right.resource ?? ""}:${right.message}`,
		),
	);
}

export function validateMetadata(
	resource: OlympiResourceMetadata,
): ResourceValidationFinding[] {
	const findings: ResourceValidationFinding[] = [];
	if (resource.schemaVersion !== 1)
		findings.push(error("schemaVersion must be 1", resource));
	if (resource.olympiOwned !== true)
		findings.push(error("resource must be Olympi-owned", resource));
	if (
		resource.provenance !== "first-party" &&
		resource.provenance !== "project-local"
	)
		findings.push(error("invalid provenance", resource));
	if (resource.name.trim().length === 0)
		findings.push(error("resource name is required", resource));
	if (resource.description.trim().length === 0)
		findings.push(error("resource description is required", resource));
	if (resource.supportFiles.length === 0)
		findings.push({
			level: "warning",
			message: "resource has no support files",
			resource: resource.name,
		});
	return findings;
}

async function validateSupportFiles(
	resource: OlympiResourceMetadata,
	inputPath: string,
): Promise<ResourceValidationFinding[]> {
	const findings: ResourceValidationFinding[] = [];
	const root = path.dirname(path.resolve(inputPath));
	for (const supportFile of resource.supportFiles) {
		const supportPath = path.join(root, supportFile.path);
		try {
			const hash = await hashFile(supportPath);
			if (supportFile.hash !== undefined && supportFile.hash !== hash) {
				findings.push(
					error(`support file hash mismatch: ${supportFile.path}`, resource),
				);
			}
		} catch {
			findings.push(
				error(`support file missing: ${supportFile.path}`, resource),
			);
		}
	}
	return findings;
}

async function readResourceFile(
	inputPath: string,
): Promise<OlympiResourceMetadata[]> {
	const parsed = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
	if (Array.isArray(parsed)) return parsed as OlympiResourceMetadata[];
	if (
		typeof parsed === "object" &&
		parsed !== null &&
		Array.isArray((parsed as { resources?: unknown }).resources)
	) {
		return (parsed as { resources: OlympiResourceMetadata[] }).resources;
	}
	return [];
}

function error(
	message: string,
	resource: OlympiResourceMetadata,
): ResourceValidationFinding {
	return { level: "error", message, resource: resource.name };
}
