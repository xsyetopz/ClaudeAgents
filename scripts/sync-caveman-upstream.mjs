import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CAVEMAN_UPSTREAM } from "../source/caveman.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const MIRROR_ROOT = resolve(REPO_ROOT, "source", "upstream", "caveman");

const REQUIRED_MARKERS = {
	"README.md": ["# caveman", "Want it always on?", "Terse like caveman."],
	".codex/hooks.json": ["SessionStart", "Terse like caveman."],
	".github/copilot-instructions.md": ["# caveman", "ACTIVE EVERY RESPONSE"],
};

export function validateUpstreamFile(relativePath, content) {
	const markers = REQUIRED_MARKERS[relativePath];
	if (!markers) {
		throw new Error(`No validation markers configured for ${relativePath}`);
	}
	for (const marker of markers) {
		if (!String(content).includes(marker)) {
			throw new Error(`Upstream ${relativePath} missing marker: ${marker}`);
		}
	}
	if (
		(relativePath === "README.md" ||
			relativePath === ".codex/hooks.json" ||
			relativePath === ".github/copilot-instructions.md") &&
		!String(content).includes("Terse like caveman.")
	) {
		throw new Error(`Upstream ${relativePath} lost the Caveman snippet`);
	}
	return true;
}

async function fetchText(url) {
	const response = await fetch(url, {
		headers: { "user-agent": "openagentsbtw-caveman-sync" },
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}
	return response.text();
}

async function writeMirrorFile(relativePath, content) {
	const absolutePath = resolve(MIRROR_ROOT, relativePath);
	await mkdir(dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, content, "utf8");
}

async function main() {
	const metadataPath = resolve(MIRROR_ROOT, "metadata.json");
	const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
	if (metadata.ref !== CAVEMAN_UPSTREAM.ref) {
		throw new Error(
			`Mirror metadata ref ${metadata.ref} does not match source/caveman.mjs ref ${CAVEMAN_UPSTREAM.ref}`,
		);
	}

	for (const file of metadata.files) {
		const content = await fetchText(file.url);
		validateUpstreamFile(file.path, content);
		await writeMirrorFile(file.path, content);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
