import { join, relative } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { SourceRecord, Surface, UnknownMap } from "@openagentlayer/types";

export interface SourceRecordBase {
	readonly id: string;
	readonly kind: SourceRecord["kind"];
	readonly title: string;
	readonly description: string;
	readonly surfaces: readonly Surface[];
	readonly location: {
		readonly directory: string;
		readonly metadataPath: string;
		readonly bodyPath: string | undefined;
	};
	readonly raw: UnknownMap;
}

export async function validateBodyFile(
	recordDirectory: string,
	bodyFile: string,
	diagnostics: {
		push: (diagnostic: ReturnType<typeof errorDiagnostic>) => void;
	},
): Promise<boolean> {
	return (
		(await readRequiredBodyFile(recordDirectory, bodyFile, diagnostics)) !==
		undefined
	);
}

export async function readRequiredBodyFile(
	recordDirectory: string,
	bodyFile: string,
	diagnostics: {
		push: (diagnostic: ReturnType<typeof errorDiagnostic>) => void;
	},
): Promise<string | undefined> {
	const bodyPath = join(recordDirectory, bodyFile);
	const text = await readTextIfPresent(bodyPath);
	if (text !== undefined) {
		return text;
	}

	diagnostics.push(
		errorDiagnostic(
			"missing-body",
			`Missing body file '${bodyFile}'.`,
			relative(process.cwd(), bodyPath),
		),
	);
	return undefined;
}

export async function readTextIfPresent(
	path: string,
): Promise<string | undefined> {
	try {
		return await Bun.file(path).text();
	} catch (error) {
		if (isNotFoundError(error)) {
			return undefined;
		}
		throw error;
	}
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
