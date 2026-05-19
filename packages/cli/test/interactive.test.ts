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

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

class ScriptedSession implements InteractiveSession {
	readonly cwd: string;
	readonly output: string[] = [];
	private readonly input: string[];

	constructor(input: string[], cwd: string = process.cwd()) {
		this.input = [...input];
		this.cwd = cwd;
	}

	ask(question: string): Promise<string> {
		this.output.push(question);
		return Promise.resolve(this.input.shift() ?? "q");
	}

	write(message: string): void {
		this.output.push(message);
	}

	text(): string {
		return this.output.join("");
	}
}

describe("Olympus interactive wrapper", () => {
	test("shows status before exiting", async () => {
		const session = new ScriptedSession(["q"]);
		const exitCode = await runInteractiveSession(session);
		expect(exitCode).toBe(0);
		expect(session.text()).toContain("Olympus interactive command hub");
		expect(session.text()).toContain("Olympus status");
		expect(session.text()).toContain("inspect local package (read-only)");
		expect(session.text()).toContain("global ~/.pi writes are never performed");
		expect(session.text()).toContain("Install passive package");
	});

	test("routes package evaluation through shared read-only service code", async () => {
		const session = new ScriptedSession([
			"2",
			"y",
			fixturePath("passive-package"),
			"q",
		]);
		const exitCode = await runInteractiveSession(session);
		expect(exitCode).toBe(0);
		expect(session.text()).toContain("Safe prompt: evaluation is read-only");
		expect(session.text()).toContain(
			"Olympus package evaluation: passive-package@1.0.0",
		);
		expect(session.text()).toContain("Decision: trust-passive");
		expect(session.text()).toContain(
			"No trust, install, sandbox, or global Pi action was taken.",
		);
	});

	test("creates first-party extension skeletons only after explicit output confirmation", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-interactive-extension-"),
		);
		try {
			const session = new ScriptedSession([
				"3",
				"guided-panel",
				tempRoot,
				"y",
				"q",
			]);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Olympus extension create dry-run");
			expect(session.text()).toContain("Olympus extension create apply");
			const manifest = JSON.parse(
				await readFile(
					path.join(tempRoot, "guided-panel", "olympus-extension.json"),
					"utf8",
				),
			);
			expect(manifest.olympusOwned).toBe(true);
			expect(manifest.commands).toEqual(["/olympus-guided-panel"]);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("keeps default project .pi extension writes blocked from the guided flow", async () => {
		const session = new ScriptedSession(["3", "dry-panel", "", "y", "q"]);
		const exitCode = await runInteractiveSession(session);
		expect(exitCode).toBe(0);
		expect(session.text()).toContain(
			"explicit output directory is required; default project .pi writes remain blocked",
		);
		await expect(
			readFile(
				path.join(
					process.cwd(),
					".pi",
					"olympus",
					"extensions",
					"dry-panel",
					"package.json",
				),
				"utf8",
			),
		).rejects.toThrow();
	});

	test("reads project-local wrapper status without mutating Pi state", async () => {
		const status = await readInteractiveStatus(process.cwd());
		expect(status.schemaVersion).toBe(1);
		expect(status.availableFlows).toContain(
			"install passive package (dry-run before confirmed project-local apply)",
		);
		expect(status.blockedFlows).toContain(
			"global ~/.pi writes are never performed by this wrapper",
		);
	});

	test("runs interactive install dry-run before confirmed apply", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-interactive-install-"),
		);
		try {
			const session = new ScriptedSession(
				["5", fixturePath("passive-package"), "y", "q"],
				tempRoot,
			);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Olympus install dry-run");
			expect(session.text()).toContain(
				"Dry-run complete before apply confirmation.",
			);
			expect(session.text()).toContain("Olympus install apply");
			const manifest = JSON.parse(
				await readFile(
					path.join(tempRoot, ".pi", "olympus", "olympus-manifest.json"),
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
			path.join(os.tmpdir(), "olympus-interactive-uninstall-"),
		);
		try {
			const install = await applyPassiveInstall({
				source: fixturePath("passive-package"),
				projectRoot: tempRoot,
				apply: true,
			});
			const session = new ScriptedSession(
				["6", install.packageId, "y", "q"],
				tempRoot,
			);
			const exitCode = await runInteractiveSession(session);
			expect(exitCode).toBe(0);
			expect(session.text()).toContain("Olympus uninstall dry-run");
			expect(session.text()).toContain(
				"Dry-run complete before apply confirmation.",
			);
			expect(session.text()).toContain("Olympus uninstall apply");
			const manifest = JSON.parse(
				await readFile(
					path.join(tempRoot, ".pi", "olympus", "olympus-manifest.json"),
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
			path.join(os.tmpdir(), "olympus-setup-status-"),
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
