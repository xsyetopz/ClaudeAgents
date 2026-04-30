import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const PACKAGE_SRC_TEST_PATTERN = /^packages\/[^/]+\/src\//u;

const PACKAGE_RULES = new Map<string, readonly string[]>([
	[
		"@openagentlayer/source",
		["@openagentlayer/render", "@openagentlayer/install"],
	],
	[
		"@openagentlayer/render",
		["@openagentlayer/cli", "@openagentlayer/install"],
	],
	["@openagentlayer/install", ["@openagentlayer/cli"]],
	[
		"@openagentlayer/adapters",
		["@openagentlayer/cli", "@openagentlayer/install"],
	],
]);

describe("OAL package boundaries", () => {
	test("keeps forbidden package dependencies out of package manifests", async () => {
		const violations: string[] = [];
		for (const [packageName, forbiddenDependencies] of PACKAGE_RULES) {
			const manifest = await readPackageManifest(packageName);
			const dependencies = Object.keys(manifest.dependencies ?? {});
			for (const forbiddenDependency of forbiddenDependencies) {
				if (dependencies.includes(forbiddenDependency)) {
					violations.push(`${packageName} -> ${forbiddenDependency}`);
				}
			}
		}

		expect(violations).toEqual([]);
	});

	test("keeps package tests outside src directories", async () => {
		const testPaths = await listFiles("packages");
		expect(
			testPaths
				.filter((path) => path.endsWith(".test.ts"))
				.filter((path) => PACKAGE_SRC_TEST_PATTERN.test(path)),
		).toEqual([]);
	});
});

async function readPackageManifest(packageName: string): Promise<{
	readonly dependencies?: Record<string, string>;
}> {
	const packageDirectory = packageName.replace("@openagentlayer/", "");
	const text = await Bun.file(
		join("packages", packageDirectory, "package.json"),
	).text();
	return JSON.parse(text) as { readonly dependencies?: Record<string, string> };
}

async function listFiles(directory: string): Promise<readonly string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const paths: string[] = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			paths.push(...(await listFiles(path)));
		}
		if (entry.isFile()) {
			paths.push(path);
		}
	}
	return paths.sort();
}
