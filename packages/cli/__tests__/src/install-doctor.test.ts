import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	createInstallTarget,
	runDoctor,
	runInstall,
} from "../_helpers/install-flow";

describe("OAL CLI install doctor flows", () => {
	test("doctor verifies installed managed files", async () => {
		const targetRoot = await createInstallTarget();
		const installResult = await runInstall({
			scope: "project",
			surface: "codex",
			target: targetRoot,
		});
		expect(installResult.exitCode).toBe(0);

		const doctorResult = await runDoctor({
			scope: "project",
			surface: "codex",
			target: targetRoot,
		});

		expect(doctorResult.exitCode).toBe(0);
		expect(doctorResult.stdout).toContain(
			"oal doctor install codex/project ok",
		);
	});

	test("doctor reports bad installed managed files", async () => {
		const targetRoot = await createInstallTarget();
		const installResult = await runInstall({
			scope: "project",
			surface: "codex",
			target: targetRoot,
		});
		expect(installResult.exitCode).toBe(0);
		await writeFile(join(targetRoot, ".codex/config.toml"), "changed\n");

		const doctorResult = await runDoctor({
			scope: "project",
			surface: "codex",
			target: targetRoot,
		});

		expect(doctorResult.exitCode).toBe(1);
		expect(doctorResult.stderr).toContain("hash-mismatch");
	});
});
