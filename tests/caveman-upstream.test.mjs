import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateUpstreamFile } from "../scripts/sync-caveman-upstream.mjs";
import { CAVEMAN_UPSTREAM } from "../source/caveman.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function readRepo(relativePath) {
	return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("caveman upstream mirror", () => {
	it("keeps metadata aligned with the canonical upstream ref", () => {
		const metadata = JSON.parse(
			readRepo("source/upstream/caveman/metadata.json"),
		);
		assert.equal(metadata.repo, CAVEMAN_UPSTREAM.repo);
		assert.equal(metadata.ref, CAVEMAN_UPSTREAM.ref);
		assert.deepEqual(
			metadata.files.map((file) => file.path),
			CAVEMAN_UPSTREAM.files,
		);
	});

	it("stores the expected upstream Caveman markers", () => {
		for (const relativePath of [
			"README.md",
			".codex/hooks.json",
			".github/copilot-instructions.md",
		]) {
			assert.equal(
				validateUpstreamFile(
					relativePath,
					readRepo(`source/upstream/caveman/${relativePath}`),
				),
				true,
			);
		}
	});
});
