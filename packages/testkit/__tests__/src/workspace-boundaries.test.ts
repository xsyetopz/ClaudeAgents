import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	directoryExists,
	PACKAGE_RULES,
	readPackageManifest,
	readWorkspacePackageNames,
} from "../_helpers/package-boundaries";

describe("OAL workspace package boundaries", () => {
	test("keeps workspace package identity under OpenAgentLayer namespace", async () => {
		const rootManifest = JSON.parse(await Bun.file("package.json").text()) as {
			readonly bin?: Record<string, string>;
			readonly name?: string;
		};
		expect(rootManifest.name).toBe("openagentlayer");
		expect(rootManifest.bin?.["oal"]).toBe("packages/cli/src/cli.ts");
		expect(await directoryExists(join("packages", "oal"))).toBe(false);

		const packageNames = await readWorkspacePackageNames();
		expect(packageNames.length).toBeGreaterThan(0);
		expect(
			packageNames.filter((name) => !name.startsWith("@openagentlayer/")),
		).toEqual([]);
	});

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
});
