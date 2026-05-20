import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPassiveInstall } from "lifecycle";
import {
	type InteractiveSession,
	readInteractiveStatus,
	readSetupStatus,
	runInteractiveSession,
} from "../src/index.js";

const FIXTURES = path.join(import.meta.dir, "fixtures");
const LINE_SPLIT_PATTERN = /\r?\n/;
const INTERNAL_SAFETY_DETAIL_PATTERN = /\b(aegis|broker|sandbox)\b/i;
const PROVIDER_DEPLOYMENT_PATTERN = /\b(provider renderers?|deploy)\b/i;
const AWKWARD_GENERATED_WORDING_PATTERN = /\bhuman output\b/i;

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

class ScriptedSession implements InteractiveSession {
	readonly cwd: string;
	readonly output: string[] = [];
	private readonly input: string[];

	constructor(input: string[], cwd: string) {
		this.input = [...input];
		this.cwd = cwd;
	}

	ask(question: string): Promise<string> {
		this.output.push(question);
		return Promise.resolve(this.input.shift() ?? "quit");
	}

	write(message: string): void {
		this.output.push(message);
	}

	text(): string {
		return this.output.join("");
	}
}

describe("Olympi interactive wrapper", () => {
	test("shows status before exiting", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-status-"),
		);
		try {
			const session = new ScriptedSession(["quit"], tempRoot);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text().split(LINE_SPLIT_PATTERN).length).toBeLessThan(20);
			expect(session.text()).toContain("Project:");
			expect(session.text()).not.toContain("goal");
			expect(session.text()).not.toContain("Package:");
			expect(session.text()).toContain("q|quit|exit");
			expect(session.text()).not.toMatch(INTERNAL_SAFETY_DETAIL_PATTERN);
			expect(session.text()).not.toMatch(PROVIDER_DEPLOYMENT_PATTERN);
			expect(session.text()).not.toMatch(AWKWARD_GENERATED_WORDING_PATTERN);
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("unknown interactive commands report stable usage", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-unknown-"),
		);
		try {
			const session = new ScriptedSession(["nope", "quit"], tempRoot);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Unknown command: nope");
			expect(session.text()).toContain("expected status, doctor, install");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("does not expose package evaluation in interactive mode", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-evaluate-"),
		);
		try {
			const session = new ScriptedSession(
				["json on", "package evaluate", fixturePath("passive-package"), "quit"],
				tempRoot,
			);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Unknown command: package");
			expect(session.text()).not.toContain('"decision": "trust-passive"');
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("does not expose safety diagnostics in interactive mode", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-safety-"),
		);
		try {
			const session = new ScriptedSession(["safety", "quit"], tempRoot);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Unknown command: safety");
			expect(session.text()).not.toContain("Aegis hooks:");
			expect(session.text()).not.toContain("Sandbox:");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("supports public quit controls", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-quit-"),
		);
		try {
			for (const command of ["q", "quit", "exit"]) {
				const session = new ScriptedSession([command], tempRoot);
				const exitCode = await runInteractiveSession(session);
				expect(exitCode).toBe(0);
				expect(session.text()).toContain("Done.");
			}
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("rejects commands absent from the public interactive surface", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-reject-"),
		);
		try {
			const session = new ScriptedSession(["unknown-admin", "quit"], tempRoot);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Unknown command: unknown-admin");
			expect(session.text()).toContain("expected status, doctor, install");
			expect(session.text()).toContain("written: none");
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("reads project-local wrapper status without mutating Pi state", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-read-status-"),
		);
		try {
			const status = await readInteractiveStatus(tempRoot);
			expect(status.schemaVersion).toBe(1);
			expect(status.availableFlows).toContain("status");
			expect(status.availableFlows).toContain("install");
			expect(status.availableFlows).not.toContain("extension");
			expect(status.availableFlows).not.toContain("package");
			expect(status.blockedFlows).toContain("global Pi writes");
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("runs interactive install dry-run before confirmed apply", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-install-"),
		);
		try {
			const session = new ScriptedSession(
				["install", fixturePath("passive-package"), "y", "quit"],
				tempRoot,
			);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("dry-run");
			expect(session.text()).toContain("apply");
			const manifest = JSON.parse(
				await readFile(
					path.join(tempRoot, ".pi", "olympi", "olympi-manifest.json"),
					"utf8",
				),
			);
			expect(manifest.packages).toHaveLength(1);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("runs interactive uninstall dry-run before confirmed apply", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-interactive-uninstall-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot: tempRoot,
				apply: true,
			});
			const session = new ScriptedSession(
				["uninstall", install.packageId, "y", "quit"],
				tempRoot,
			);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("dry-run");
			expect(session.text()).toContain("apply");
			const manifest = JSON.parse(
				await readFile(
					path.join(tempRoot, ".pi", "olympi", "olympi-manifest.json"),
					"utf8",
				),
			);
			expect(manifest.packages).toEqual([]);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("setup status detects project state without mutation", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-setup-status-"),
		);
		try {
			const before = await readSetupStatus(tempRoot);
			expect(before.command).toBe("setup status");
			expect(before.configured.projectPiPresent).toBe(false);
			await expect(
				readFile(path.join(tempRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
