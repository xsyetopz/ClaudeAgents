#!/usr/bin/env bun
const policyId = "source-drift-guard";
const TRAILING_SLASH_PATTERN = /\/$/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:/u;
const PATH_SEPARATOR_PATTERN = /[\\/]/u;

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) {
		text += chunk;
	}
	return text.trim() === "" ? {} : JSON.parse(text);
}

function extractMetadataString(payload, key) {
	const metadata = payload?.metadata ?? {};
	return typeof metadata[key] === "string" ? metadata[key] : undefined;
}

async function sha256(content) {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function discoverManifestPaths(targetRoot) {
	const root = targetRoot.replace(TRAILING_SLASH_PATTERN, "");
	const candidates = [
		"codex-project",
		"claude-project",
		"opencode-project",
		"codex-global",
		"claude-global",
		"opencode-global",
	].map((name) => `${root}/.oal/manifest/${name}.json`);
	const existing = [];
	for (const candidate of candidates) {
		if (await Bun.file(candidate).exists()) {
			existing.push(candidate);
		}
	}
	return existing;
}

function isSafeRelativePath(path) {
	return (
		typeof path === "string" &&
		!path.startsWith("/") &&
		!WINDOWS_ABSOLUTE_PATH_PATTERN.test(path) &&
		!path.split(PATH_SEPARATOR_PATTERN).includes("..")
	);
}

async function evaluate(payload) {
	const manifestPath = extractMetadataString(payload, "manifest_path");
	const targetRoot =
		extractMetadataString(payload, "target_root") ??
		payload.cwd ??
		process.cwd();
	const manifestPaths =
		manifestPath === undefined
			? await discoverManifestPaths(targetRoot)
			: [manifestPath];
	if (manifestPaths.length === 0) {
		return {
			decision: "deny",
			policy_id: policyId,
			message: "Source drift guard failed: no managed manifest found.",
		};
	}

	const issues = [];
	for (const path of manifestPaths) {
		const manifestFile = Bun.file(path);
		if (!(await manifestFile.exists())) {
			issues.push(`missing-manifest:${path}`);
			continue;
		}
		const manifest = JSON.parse(await manifestFile.text());
		for (const entry of manifest.entries ?? []) {
			if (!isSafeRelativePath(entry.path)) {
				issues.push(`path-escape:${entry.path}`);
				continue;
			}
			const filePath = `${targetRoot.replace(TRAILING_SLASH_PATTERN, "")}/${entry.path}`;
			const file = Bun.file(filePath);
			if (!(await file.exists())) {
				issues.push(`missing:${entry.path}`);
				continue;
			}
			const actualSha = await sha256(await file.text());
			if (actualSha !== entry.sha256) {
				issues.push(`changed:${entry.path}`);
			}
		}
	}

	return issues.length > 0
		? {
				context: { issues },
				decision: "deny",
				policy_id: policyId,
				message: `Managed install drift detected: ${issues.join(", ")}`,
			}
		: {
				decision: "allow",
				policy_id: policyId,
				message: "Managed install matches manifest.",
			};
}

const decision = await evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
