import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { toPosix } from "../hashing";
import { stablePrettyJson } from "../reports/schema";
import { FIRST_PARTY_RESOURCE_METADATA } from "./schema";

export interface FirstPartyPackagePlan {
	schemaVersion: 1;
	command: "resources package";
	apply: boolean;
	manifestReady: true;
	blocked: boolean;
	wouldWrite: string[];
	written: string[];
	resources: number;
}

export async function writeFirstPartyResourcePackage(
	outputDirectory: string,
	apply: boolean,
): Promise<FirstPartyPackagePlan> {
	const files = packageFiles();
	const root = path.resolve(outputDirectory);
	const writePaths = files.map((file) =>
		toPosix(path.join(root, file.relativePath)),
	);
	if (!apply) {
		return {
			schemaVersion: 1,
			command: "resources package",
			apply,
			manifestReady: true,
			blocked: false,
			wouldWrite: writePaths,
			written: [],
			resources: FIRST_PARTY_RESOURCE_METADATA.length,
		};
	}
	for (const file of files) {
		const target = path.join(root, file.relativePath);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, file.content);
	}
	return {
		schemaVersion: 1,
		command: "resources package",
		apply,
		manifestReady: true,
		blocked: false,
		wouldWrite: [],
		written: writePaths,
		resources: FIRST_PARTY_RESOURCE_METADATA.length,
	};
}

function packageFiles(): Array<{ relativePath: string; content: string }> {
	const files: Array<{ relativePath: string; content: string }> = [
		{
			relativePath: "olympus-resources.json",
			content: stablePrettyJson({
				schemaVersion: 1,
				resources: FIRST_PARTY_RESOURCE_METADATA,
			}),
		},
	];
	for (const resource of FIRST_PARTY_RESOURCE_METADATA) {
		const body = `# ${resource.name}\n\n${resource.description}\n\nCommands: ${resource.commands.join(", ")}\n`;
		for (const support of resource.supportFiles) {
			files.push({ relativePath: support.path, content: body });
		}
	}
	return files.map((file) => ({
		...file,
		content: file.content.endsWith("\n") ? file.content : `${file.content}\n`,
	}));
}

export function contentHash(text: string): string {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}
