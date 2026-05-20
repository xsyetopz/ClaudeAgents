import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");
const FIXTURES = path.join(import.meta.dir, "fixtures");
const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const LINE_SPLIT_PATTERN = /\r?\n/;
const HELP_COMMAND_PATTERN = /^ {2}([a-z][a-z-]*)\s{2,}/gm;
const DEBUG_SURFACE_PATTERN = /\bdebug\b/i;
const INTERNAL_SAFETY_DETAIL_PATTERN = /\b(aegis|broker|sandbox)\b/i;
const PROVIDER_DEPLOYMENT_PATTERN = /\b(provider renderers?|deploy)\b/i;
const AWKWARD_GENERATED_WORDING_PATTERN = /\bhuman output\b/i;

function fixturePath(name: string): string {
	return path.join(FIXTURES, name);
}

async function runCli(
	args: string[],
	cwd?: string,
	env?: Record<string, string | undefined>,
) {
	const tempRoot =
		cwd === undefined
			? await mkdtemp(path.join(os.tmpdir(), "olympi-cli-cwd-"))
			: null;
	try {
		const commandCwd = cwd ?? tempRoot;
		if (commandCwd === null) throw new Error("missing CLI cwd");
		const proc = Bun.spawn(["bun", CLI, ...args], {
			cwd: commandCwd,
			env: { ...process.env, ...(env ?? {}) },
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
		if (tempRoot !== null) {
			await rm(tempRoot, { recursive: true, force: true });
		}
	}
}

function listedCommands(helpText: string): string[] {
	const section =
		helpText.split("Commands:\n")[1]?.split("\n\nModel:")[0] ?? "";
	return Array.from(section.matchAll(HELP_COMMAND_PATTERN), (match) =>
		String(match[1]),
	);
}

function defaultSurfacePolicyViolations(output: string): string[] {
	return [
		["debug", DEBUG_SURFACE_PATTERN],
		["internal-safety-detail", INTERNAL_SAFETY_DETAIL_PATTERN],
		["provider-deployment", PROVIDER_DEPLOYMENT_PATTERN],
		["awkward-generated-wording", AWKWARD_GENERATED_WORDING_PATTERN],
	].flatMap(([label, pattern]) =>
		(pattern as RegExp).test(output) ? [String(label)] : [],
	);
}

function quotedArrayValues(source: string, constantName: string): string[] {
	const match = source.match(
		new RegExp(`const ${constantName} = \\[([\\s\\S]*?)\\] as const;`),
	);
	return Array.from(match?.[1]?.matchAll(/"([^"]+)"/g) ?? [], (item) =>
		String(item[1]),
	);
}

function forwardedTopLevelCommands(source: string): string[] {
	return Array.from(
		source.matchAll(/forwardCommand\(\s*program,\s*"([^"]+)"/g),
		(match) => String(match[1]),
	);
}

describe("Olympi CLI and interactive command surface", () => {
	test("router surface contract lists approved route classes", async () => {
		const source = await readFile(CLI, "utf8");
		const defaultPublic = quotedArrayValues(
			source,
			"PUBLIC_TOP_LEVEL_COMMANDS",
		);
		const dev = quotedArrayValues(source, "DEV_COMMANDS");
		const safety = quotedArrayValues(source, "SAFETY_COMMANDS");
		const debug = quotedArrayValues(source, "DEBUG_COMMANDS");
		const packageAdmin = quotedArrayValues(source, "PACKAGE_COMMANDS");
		const forwarded = forwardedTopLevelCommands(source);

		expect(defaultPublic).toEqual([
			"install",
			"uninstall",
			"status",
			"doctor",
			"report",
			"memory",
			"help",
		]);
		expect(forwarded).toEqual([
			"dev",
			"package",
			"install",
			"uninstall",
			"status",
			"doctor",
			"report",
			"memory",
			"safety",
			"debug",
			"interactive",
		]);
		expect(packageAdmin).toEqual(["inspect", "evaluate", "risk"]);
		expect(safety).toEqual(["check", "hooks", "sandbox", "broker", "trust"]);
		expect(dev).toEqual([
			"package",
			"install",
			"uninstall",
			"doctor",
			"verify",
			"catalog",
			"hooks",
			"intelligence",
			"feedback",
			"skills",
			"provenance",
		]);
		expect(debug).toEqual([
			"context",
			"compact",
			"quota",
			"lock",
			"profile",
			"resources",
			"prompt",
			"review",
			"handoff",
			"module",
			"extension",
			"audit",
		]);
	});

	test("help output is concise and uses the public command surface", async () => {
		const result = await runCli(["--help"]);
		expect(result.exitCode).toBe(0);
		expect(listedCommands(result.stdout)).toEqual([
			"install",
			"uninstall",
			"doctor",
			"status",
			"report",
			"memory",
		]);
		expect(result.stdout).toContain("/olympi-goal");
		expect(result.stdout).not.toContain("olympi dev");
		expect(result.stdout).not.toContain("olympi debug");
		expect(result.stdout).not.toContain("olympi safety");
		expect(result.stdout).not.toContain("interactive");
		expect(result.stdout.split(LINE_SPLIT_PATTERN).length).toBeLessThan(40);
		expect(defaultSurfacePolicyViolations(result.stdout)).toEqual([]);
	});

	test("full help is available on request", async () => {
		const result = await runCli(["help", "all"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("/olympi-goal <goal>");
		expect(result.stdout).toContain("/olympi-resume <goal-id>");
		expect(result.stdout).toContain("/olympi-handoff");
		expect(result.stdout).toContain("Internal CI/developer forms");
		expect(result.stdout).toContain("olympi doctor [--json]");
		expect(result.stdout).toContain("olympi dev verify [--json]");
		expect(result.stdout).toContain("olympi dev catalog [--json]");
		expect(result.stdout).toContain("olympi debug compact");
		expect(result.stdout).not.toContain("olympi debug verify");
		expect(result.stdout).not.toContain("olympi debug catalog");
	});

	test("developer mode exposes hooks skills provenance and verification", async () => {
		const hooks = await runCli(["dev", "hooks", "policy", "--json"]);
		expect(hooks.exitCode).toBe(0);
		expect(JSON.parse(hooks.stdout).command).toBe("hooks policy");

		const skills = await runCli(["dev", "skills", "--json"]);
		expect(skills.exitCode).toBe(0);
		expect(JSON.parse(skills.stdout).skills.length).toBeGreaterThan(0);

		const provenance = await runCli(["dev", "provenance", "--json"]);
		expect([0, 1]).toContain(provenance.exitCode);
		expect(JSON.parse(provenance.stdout).command).toBe("dev provenance");

		const verify = await runCli(["dev", "verify", "--json"]);
		expect(verify.exitCode).toBe(0);
		expect(JSON.parse(verify.stdout).ok).toBe(true);
	});

	test("package and safety surfaces stay admin/security only", async () => {
		const inspect = await runCli([
			"package",
			"inspect",
			fixturePath("passive-package"),
			"--json",
		]);
		expect(inspect.exitCode).toBe(0);
		expect(JSON.parse(inspect.stdout).package.source).toContain(
			"passive-package",
		);

		const packageRisk = await runCli([
			"package",
			"risk",
			fixturePath("passive-package"),
			"--json",
		]);
		expect(packageRisk.exitCode).toBe(0);
		expect(JSON.parse(packageRisk.stdout).command).toBe("report package-risk");

		const safetyCheck = await runCli(["safety", "check", "--json"]);
		expect([0, 1]).toContain(safetyCheck.exitCode);
		expect(JSON.parse(safetyCheck.stdout).command).toBe("safety check");

		for (const args of [
			["package", "nope"],
			["safety", "nope"],
		]) {
			const result = await runCli([...args, "--json"]);
			expect(result.exitCode).toBe(2);
			expect(JSON.parse(result.stderr).error.message).toContain(
				"Invalid subcommand",
			);
		}
	});

	test("developer namespace stays bounded and does not absorb debug or safety surfaces", async () => {
		for (const args of [
			["dev", "debug"],
			["dev", "resources"],
			["dev", "sandbox"],
			["dev", "broker"],
			["dev", "trust"],
			["dev", "report"],
			["dev", "profile"],
		]) {
			const result = await runCli([...args, "--json"]);
			expect(result.exitCode).toBe(2);
		}
	});

	test("package entrypoint exports are documented", async () => {
		const entrypoints = [
			"packages/authoring/src/index.ts",
			"packages/cli/src/index.ts",
			"packages/extensions/src/index.ts",
			"packages/lifecycle/src/index.ts",
			"packages/reporting/src/index.ts",
			"packages/safety/src/index.ts",
			"packages/trust/src/index.ts",
		];
		for (const entrypoint of entrypoints) {
			const lines = (
				await readFile(path.join(REPO_ROOT, entrypoint), "utf8")
			).split(LINE_SPLIT_PATTERN);
			for (const [index, line] of lines.entries()) {
				if (!line.startsWith("export ")) continue;
				let previous = index - 1;
				while (previous >= 0 && lines[previous]?.trim() === "") previous -= 1;
				expect(
					lines[previous]?.trim().startsWith("/**"),
					`${entrypoint}:${index + 1}`,
				).toBe(true);
			}
		}
	});

	test("safety-specific vocabulary is scoped to safety surfaces", async () => {
		const help = await runCli(["help", "all"]);
		expect(help.exitCode).toBe(0);
		expect(help.stdout).toContain("olympi safety sandbox check [--json]");
		expect(help.stdout).toContain("olympi safety hooks aegis-runtime [--json]");

		const sandbox = await runCli(["safety", "sandbox", "check", "--json"]);
		expect([0, 1]).toContain(sandbox.exitCode);
		expect(JSON.parse(sandbox.stdout).command).toBe("sandbox check");
	});

	test("current admin and CI commands route to implemented Olympi surfaces", async () => {
		const evaluate = await runCli([
			"dev",
			"package",
			"evaluate",
			fixturePath("passive-package"),
			"--json",
		]);
		expect(evaluate.exitCode).toBe(0);
		expect(JSON.parse(evaluate.stdout).decision).toBe("trust-passive");

		const risk = await runCli([
			"dev",
			"package",
			"risk",
			fixturePath("passive-package"),
			"--json",
		]);
		expect(risk.exitCode).toBe(0);
		expect(JSON.parse(risk.stdout).command).toBe("report package-risk");

		const accept = await runCli(["report", "acceptance", "--json"]);
		expect(accept.exitCode).toBe(0);
		expect(JSON.parse(accept.stdout).command).toBe("report acceptance");

		const verify = await runCli(["dev", "verify", "--json"]);
		expect(verify.exitCode).toBe(0);
		expect(JSON.parse(verify.stdout).ok).toBe(true);

		const catalog = await runCli(["dev", "catalog", "--json"]);
		expect(catalog.exitCode).toBe(0);
		expect(JSON.parse(catalog.stdout).valid).toBe(true);
	});

	test("JSON error output uses stable shape without stack traces", async () => {
		const result = await runCli(["nope", "--json"]);
		expect(result.exitCode).toBe(2);
		const error = JSON.parse(result.stderr);
		expect(error).toEqual({
			schemaVersion: 1,
			ok: false,
			error: {
				code: "MALFORMED_USAGE_OR_INPUT",
				message: "Unknown command: nope",
				exitCode: 2,
				input: "nope",
				expected: "install, uninstall, status, doctor, report, memory, help",
			},
			written: [],
		});
		expect(result.stderr).not.toContain("at ");
	});

	test("uninstall dry-run reports exact manifest-authorized actions", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-cli-plan-"));
		try {
			const install = await runCli(
				[
					"dev",
					"install",
					fixturePath("passive-package"),
					"--project",
					"--apply",
					"--json",
				],
				tempRoot,
			);
			expect(install.exitCode).toBe(0);
			const packageId = JSON.parse(install.stdout).packageId;
			const plan = await runCli(
				["dev", "uninstall", packageId, "--project", "--dry-run", "--json"],
				tempRoot,
			);
			expect(plan.exitCode).toBe(0);
			const report = JSON.parse(plan.stdout);
			expect(report.wouldRead).toContain(".pi/olympi/olympi-manifest.json");
			expect(report.wouldRemove).toContain(".pi/settings.json packages entry");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("default command shows bootstrap/admin help instead of interactive workflow", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-cli-default-"),
		);
		try {
			const result = await runCli([], tempRoot);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("olympi install --dry-run");
			expect(result.stdout).toContain("/olympi-goal");
			expect(result.stdout).not.toContain("q|quit|exit");
			expect(defaultSurfacePolicyViolations(result.stdout)).toEqual([]);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("doctor is read-only and detects empty project state", async () => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-cli-setup-"));
		try {
			const result = await runCli(["doctor", "--json"], tempRoot);
			expect(result.exitCode).toBe(1);
			const report = JSON.parse(result.stdout);
			expect(report.command).toBe("doctor");
			expect(report.setup.configured.projectPiPresent).toBe(false);
			expect(report.mutationPolicy).toBe("read-only");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
