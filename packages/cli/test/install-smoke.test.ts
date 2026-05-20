import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");

function text(stream: ReadableStream<Uint8Array> | null): Promise<string> {
	return stream === null ? Promise.resolve("") : new Response(stream).text();
}

describe("Olympi install invocation smoke", () => {
	test("source-global Bun install exposes a CLI binary without global Pi state", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-bin-smoke-"));
		const bunHome = path.join(tempRoot, "bun-home");
		const fakeHome = path.join(tempRoot, "home");
		const projectRoot = path.join(tempRoot, "project");
		await mkdir(projectRoot, { recursive: true });
		try {
			const install = Bun.spawn(
				["bun", "install", "-g", REPO_ROOT, "--production", "--ignore-scripts"],
				{
					cwd: REPO_ROOT,
					env: { ...process.env, BUN_INSTALL: bunHome, HOME: fakeHome },
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
				cwd: projectRoot,
				env: {
					...process.env,
					BUN_INSTALL: bunHome,
					HOME: fakeHome,
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
			expect(stdout).toContain("goal");
			expect(stdout).toContain(
				"CLI is bootstrap/admin only; normal workflows live in Pi slash commands, skills, hooks, and tool shims",
			);
			await expect(
				readFile(path.join(fakeHome, ".pi", "agent", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
