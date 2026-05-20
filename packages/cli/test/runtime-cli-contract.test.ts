import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decideHostBrokerRequest, normalizeCommandExecution } from "safety";
import { policyEventFromPi } from "../../extensions/src/aegis/pi-runtime.js";
import { recordFeedbackItem } from "../../lifecycle/src/feedback.js";
import { createCliProgram } from "../src/index.js";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");
const REPO_ROOT = path.resolve(import.meta.dir, "../../..");

async function runCli(args: string[], cwd?: string, home?: string) {
	const tempRoot =
		cwd === undefined
			? await mkdtemp(path.join(os.tmpdir(), "olympi-runtime-cli-"))
			: null;
	try {
		const commandCwd = cwd ?? tempRoot;
		if (commandCwd === null) throw new Error("missing cwd");
		const proc = Bun.spawn(["bun", CLI, ...args], {
			cwd: commandCwd,
			env: { ...process.env, ...(home === undefined ? {} : { HOME: home }) },
			stderr: "pipe",
			stdout: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		return { stdout, stderr, exitCode };
	} finally {
		if (tempRoot !== null) await rm(tempRoot, { recursive: true, force: true });
	}
}

describe("runtime model and CLI foundations", () => {
	test("help and status state the primary Pi extension harness runtime model", async () => {
		const help = await runCli(["--help"]);
		expect(help.exitCode).toBe(0);
		expect(help.stdout).toContain(
			"Pi is the host; Olympi runs within Pi as a first-party extension/harness layer",
		);
		expect(help.stdout).toContain(
			"CLI is bootstrap/admin only; normal workflows live in Pi slash commands, skills, hooks, and tool shims",
		);
		expect(help.stdout).toContain("/olympi-goal");

		const status = await runCli(["status", "--json"]);
		expect(status.exitCode).toBe(0);
		const report = JSON.parse(status.stdout);
		expect(report.runtimeModel.primary).toBe("pi-extension-harness");
		expect(report.runtimeModel.hostRuntime).toBe("pi");
		expect(report.runtimeModel.cliRole).toBe("entrypoint-wrapper");
		expect(report.runtimeModel.runsWithinPi).toBe(true);
		expect(report.runtimeModel.stateRoot).toBe(".pi/olympi");
		expect(report.runtimeModel.piInvocation).toBe("pi-extension");
		expect(report.runtimeModel.globalPiInstall).toBe("explicit-global-only");
		expect(report.runtimeModel.globalBinaryInstall).toBe("optional-cli-only");
		expect(report.runtimeModel.projectInstall).toBe(
			"default-project-local-pi-extension-and-state",
		);
		expect(report.runtimeModel.cliEntrypoint).toBe(
			"development-admin-automation",
		);
		expect(report.runtimeModel.allowedProjectWrites).toContain(
			".pi/extensions/olympi-aegis.ts after olympi install --apply or safety hooks aegis-install --project --apply",
		);
		expect(report.runtimeModel.allowedGlobalWrites).toEqual([
			"~/.pi/agent/extensions/olympi-aegis.ts only after explicit olympi install --global --apply",
		]);
		expect(report.runtimeModel.unsupported).toContain(
			"standalone replacement for Pi",
		);
		expect(report.runtimeModel.unsupported).toContain(
			"implicit global Olympi install into ~/.pi/agent without --global and confirmation",
		);
	});

	test("source uses Commander for normal CLI and Inquirer prompts for interactive CLI", async () => {
		const cliSource = await readFile(
			path.join(REPO_ROOT, "packages", "cli", "src", "cli.ts"),
			"utf8",
		);
		const interactiveSource = await readFile(
			path.join(REPO_ROOT, "packages", "cli", "src", "interactive.ts"),
			"utf8",
		);
		expect(cliSource).toContain('from "commander"');
		expect(createCliProgram(["--help"]).name()).toBe("olympi");
		expect(createCliProgram(["--help"]).description()).toContain(
			"Pi extension/harness CLI entrypoint",
		);
		expect(interactiveSource).toContain('from "@inquirer/prompts"');
		expect(interactiveSource).not.toContain("node:readline/promises");
	});

	test("catalog and product specs do not claim standalone replacement behavior", async () => {
		const catalog = await runCli(["dev", "catalog", "--json"]);
		expect(catalog.exitCode).toBe(0);
		const report = JSON.parse(catalog.stdout);
		expect(report.contract).toContain("First-party Pi extension/harness");
		expect(report.contract).toContain("Pi invokes Olympi as an extension");
		expect(report.contract).toContain("default install is project-local");
		expect(report.contract).toContain(
			"explicit --global registers global Pi use",
		);
		expect(report.contract).toContain(
			"package-manager global CLI installation is separate",
		);

		for (const relativePath of [
			"specs/product.md",
			"specs/cli.md",
			"docs/architecture.md",
		]) {
			const text = await readFile(path.join(REPO_ROOT, relativePath), "utf8");
			expect(text).toContain("Pi extension/harness");
			expect(text).not.toContain("standalone binary/harness");
			expect(text).not.toContain("runs outside Pi");
		}
	});

	test("commands do not write user-global .pi state by default", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-no-global-"));
		const fakeHome = path.join(tempRoot, "home");
		const projectRoot = path.join(tempRoot, "project");
		await mkdir(projectRoot, { recursive: true });
		await Bun.write(path.join(projectRoot, ".keep"), "");
		try {
			const result = await runCli(["status", "--json"], projectRoot, fakeHome);
			expect(result.exitCode).toBe(0);
			await expect(
				readFile(path.join(fakeHome, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("text and JSON errors include failed input, expected shape, and write summary", async () => {
		const text = await runCli(["foo"]);
		expect(text.exitCode).toBe(2);
		expect(text.stderr).toContain("Unknown command: foo");
		expect(text.stderr).toContain(
			"expected: install, uninstall, status, doctor, report, memory, help",
		);
		expect(text.stderr).toContain("written: none");

		const json = await runCli(["package", "nope", "--json"]);
		expect(json.exitCode).toBe(2);
		const payload = JSON.parse(json.stderr);
		expect(payload.ok).toBe(false);
		expect(payload.error.code).toBe("MALFORMED_USAGE_OR_INPUT");
		expect(payload.error.message).toContain(
			"Invalid subcommand for package: nope",
		);
		expect(payload.error.input).toBe("nope");
		expect(payload.error.expected).toBe("inspect, evaluate, risk");
		expect(payload.written).toEqual([]);
	});

	test("routing and classification switch/default paths stay explicit", async () => {
		const rtkSource = await readFile(
			path.join(
				REPO_ROOT,
				"packages",
				"reporting",
				"src",
				"compaction",
				"rtk.ts",
			),
			"utf8",
		);
		const fallbackSource = await readFile(
			path.join(
				REPO_ROOT,
				"packages",
				"reporting",
				"src",
				"compaction",
				"fallback.ts",
			),
			"utf8",
		);
		expect(rtkSource).toContain("switch (kind)");
		expect(rtkSource).toContain("switch (category)");
		expect(rtkSource).not.toContain('if (kind === "git") return');
		expect(rtkSource).not.toContain(
			'if (category === "git-diff-status-log") return',
		);
		expect(fallbackSource).toContain("switch (kind)");
		expect(fallbackSource).not.toContain('if (kind === "git") return');

		const command = normalizeCommandExecution({
			rawCommand: "git commit -m test",
			cwd: REPO_ROOT,
		});
		expect(command.commit).toBe(true);
		expect(command.policyDecision.commandClassification?.primaryClass).toBe(
			"commit",
		);

		const event = policyEventFromPi("tool_call", {
			toolName: "bash",
			input: { command: "git add .pi/settings.json" },
		});
		expect(event.operation).toBe("execute");

		const broker = decideHostBrokerRequest({
			schemaVersion: 1,
			resourceId: "x",
			mode: "dry-run",
			capabilities: ["filesystem", "mystery"],
		});
		expect(broker.allowed).toBe(false);
		expect(broker.reasons[0]).toContain("unknown executable capability");

		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-feedback-"));
		try {
			const item = await recordFeedbackItem(tempRoot, {
				source: "provider-broker-gap",
				observedProblem: "broker classification missing",
				evidence: ["test"],
				affected: ["packages/safety/src/broker/host.ts"],
			});
			expect(item.classification).toBe("provider contract gap");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("TypeScript version contract stays on repository-declared 6.x", async () => {
		const rootPackage = JSON.parse(
			await readFile(path.join(REPO_ROOT, "package.json"), "utf8"),
		);
		const lock = await readFile(path.join(REPO_ROOT, "bun.lock"), "utf8");
		expect(rootPackage.devDependencies.typescript).toBe("6.0.3");
		expect(lock).toContain('"typescript": "6.0.3"');
		expect(lock).not.toContain("typescript@5.");
	});
});
