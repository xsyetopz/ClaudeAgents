import { readdir } from "node:fs/promises";
import { join } from "node:path";

const PACKAGE_TESTS = [
	"accept",
	"adapter",
	"artifact",
	"cli",
	"deploy",
	"manifest",
	"policy",
	"runtime",
	"source",
	"toolchain",
] as const;

export async function assertTestInventory(repoRoot: string): Promise<void> {
	for (const packageName of PACKAGE_TESTS) {
		const testRoot = join(repoRoot, "packages", packageName, "__tests__");
		const tests = await readdir(testRoot);
		if (!tests.some((name) => name.endsWith(".test.ts")))
			throw new Error(`Missing unit test for package ${packageName}.`);
	}
	const integrationTests = await readdir(join(repoRoot, "tests"));
	if (!integrationTests.some((name) => name.endsWith(".test.ts")))
		throw new Error("Missing root integration/e2e test.");
}
