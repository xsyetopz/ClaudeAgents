import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { runCli } from "../_helpers/cli";

describe("OAL CLI commands", () => {
	test("help uses OAL CLI namespace", async () => {
		const result = await runCli(["help"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: oal ");
	});

	test("doctor verifies source and rendered hook scripts", async () => {
		const result = await runCli(["doctor", "--root", process.cwd()]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("oal doctor ok:");
	});

	test("dry-run render reports write plan without writing files", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"render",
			"--dry-run",
			"--out",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("add\tmanifest.json");
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			false,
		);
	});

	test("render writes generated output without dry-run", async () => {
		const targetRoot = await createFixtureRoot();

		const result = await runCli([
			"render",
			"--out",
			targetRoot,
			"--root",
			process.cwd(),
		]);

		expect(result.exitCode).toBe(0);
		expect(await Bun.file(join(targetRoot, "manifest.json")).exists()).toBe(
			true,
		);
		expect(await Bun.file(join(targetRoot, "graph.json")).exists()).toBe(true);
	});
});
