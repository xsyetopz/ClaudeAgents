import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");

function text(stream: ReadableStream<Uint8Array> | null): Promise<string> {
	return stream === null ? Promise.resolve("") : new Response(stream).text();
}

describe("Olympi install invocation smoke", () => {
	test("source-global Bun install exposes the olympi binary", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-bin-smoke-"));
		const bunHome = path.join(tempRoot, "bun-home");
		try {
			const install = Bun.spawn(
				["bun", "install", "-g", REPO_ROOT, "--production", "--ignore-scripts"],
				{
					cwd: REPO_ROOT,
					env: { ...process.env, BUN_INSTALL: bunHome },
					stderr: "pipe",
					stdout: "pipe",
				},
			);
			const [installStdout, installStderr, installExit] = await Promise.all([
				text(install.stdout),
				text(install.stderr),
				install.exited,
			]);
			expect(installExit).toBe(0);
			expect(`${installStdout}\n${installStderr}`).toContain("olympi");

			const smoke = Bun.spawn(["olympi", "--help"], {
				cwd: REPO_ROOT,
				env: {
					...process.env,
					BUN_INSTALL: bunHome,
					PATH: `${path.join(bunHome, "bin")}:${process.env["PATH"] ?? ""}`,
				},
				stderr: "pipe",
				stdout: "pipe",
			});
			const [stdout, stderr, exitCode] = await Promise.all([
				text(smoke.stdout),
				text(smoke.stderr),
				smoke.exited,
			]);
			expect(stderr).toBe("");
			expect(exitCode).toBe(0);
			expect(stdout).toContain("package");
			expect(stdout).toContain("verify");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
