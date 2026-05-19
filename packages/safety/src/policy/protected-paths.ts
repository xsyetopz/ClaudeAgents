import os from "node:os";
import path from "node:path";

const PROTECTED_RELATIVE_PREFIXES = [
	".ssh",
	".config/gh",
	".pi/agent",
	".gnupg",
];

export function protectedPathReasons(
	inputPath: string | undefined,
	manifestOwned = false,
): string[] {
	if (inputPath === undefined || inputPath.length === 0) return [];
	const normalized = normalizePath(inputPath);
	const home = normalizePath(os.homedir());
	const reasons: string[] = [];
	for (const relativePrefix of PROTECTED_RELATIVE_PREFIXES) {
		if (
			normalized === `~/${relativePrefix}` ||
			normalized.startsWith(`~/${relativePrefix}/`) ||
			(home !== "" && normalized.startsWith(`${home}/${relativePrefix}`))
		) {
			reasons.push(`protected path denied: ${relativePrefix}`);
		}
	}
	if (isGlobalPiPath(normalized) && !manifestOwned) {
		reasons.push(
			"unsafe ~/.pi write/read denied without project manifest ownership",
		);
	}
	return reasons;
}

export function generatedArtifactReasons(
	generatedArtifact: boolean | undefined,
	manifestOwned: boolean | undefined,
): string[] {
	if (generatedArtifact === true && manifestOwned !== true) {
		return ["generated artifact write denied without manifest ownership"];
	}
	return [];
}

function isGlobalPiPath(normalized: string): boolean {
	const home = normalizePath(os.homedir());
	return (
		normalized === "~/.pi" ||
		normalized.startsWith("~/.pi/") ||
		(home !== "" && normalized.startsWith(`${home}/.pi/`))
	);
}

function normalizePath(value: string): string {
	return value.replaceAll(path.sep, "/").replace(/\/+$|^\.\//g, "");
}
