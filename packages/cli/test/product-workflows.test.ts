import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildMutationQueuePlan, installFirstPartyResources } from "authoring";
import {
	createAegisPiExtension,
	installAegisPiExtension,
	installAegisProjectExtension,
	uninstallAegisPiExtension,
} from "extensions";
import {
	initializeMemoryStore,
	readEnabledMemoryText,
	readMemoryStatus,
	readProfileStatus,
	setMemoryEnabled,
	setProjectProfile,
} from "lifecycle";
import { planRtkCommand } from "reporting";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

describe("Olympi product workflows", () => {
	test("RTK command planning is advisory and command-form aware", () => {
		const plan = planRtkCommand("git diff --stat", { PATH: "" });
		expect(plan.category).toBe("git-diff-status-log");
		expect(plan.recommendedForm).toContain("rtk git diff --stat");
		expect(plan.reasons.join("\n")).toContain("proxied through RTK");
	});

	test("first-party resources install is project-local and explicit", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-resources-install-"),
		);
		try {
			const dryRun = await installFirstPartyResources({
				projectRoot,
				apply: false,
			});
			expect(dryRun.wouldWrite).toContain(".pi/settings.json packages entry");
			await expect(
				readFile(path.join(projectRoot, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
			const applied = await installFirstPartyResources({
				projectRoot,
				apply: true,
			});
			expect(applied.written.length).toBeGreaterThan(0);
			const settings = await readFile(
				path.join(projectRoot, ".pi", "settings.json"),
				"utf8",
			);
			expect(settings).toContain("first-party-resources");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Aegis project install writes only project-local extension entrypoint", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-aegis-install-"),
		);
		try {
			const dryRun = await installAegisProjectExtension({
				projectRoot,
				apply: false,
			});
			expect(dryRun.scope).toBe("project-local");
			expect(dryRun.targetStatePath).toBe(path.join(projectRoot, ".pi"));
			expect(dryRun.wouldWrite).toContain(".pi/extensions/olympi-aegis.ts");
			expect(dryRun.wouldWrite).toContain(
				".pi/olympi/core/package/olympi-runtime.json",
			);
			expect(dryRun.wouldWrite).toContain(".pi/settings.json packages entry");
			expect(dryRun.slashCommands).toContain("/olympi-goal");
			expect(dryRun.slashCommands).toContain("/olympi-resume");
			expect(dryRun.slashCommands).toContain("/olympi-feedback");
			expect(dryRun.slashCommands).toContain("/olympi-context");
			expect(dryRun.skills).toContain("/skill:olympi-goal-loop");
			expect(dryRun.prompts).toContain("/olympi-goal");
			expect(dryRun.toolShims).toContain("unsupported-command->rtk proxy");
			expect(dryRun.toolShims).toContain("bash->rtk-route");
			const applied = await installAegisProjectExtension({
				projectRoot,
				apply: true,
			});
			expect(applied.scope).toBe("project-local");
			expect(applied.written.length).toBeGreaterThan(0);
			expect(applied.written).toContain(".pi/extensions/olympi-aegis.ts");
			expect(applied.written).toContain(
				".pi/olympi/core/package/skills/olympi-goal-loop/SKILL.md",
			);
			expect(applied.written).toContain(
				".pi/olympi/core/package/olympi-runtime.json",
			);
			const source = await readFile(
				path.join(projectRoot, ".pi", "extensions", "olympi-aegis.ts"),
				"utf8",
			);
			expect(source).toContain("createAegisPiExtension");
			expect(source).toContain("packages/extensions/src/aegis/pi-runtime.ts");
			expect(source).not.toContain('from "extensions"');
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Aegis uninstall removes only manifest-owned Pi slash resources", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-aegis-uninstall-"),
		);
		try {
			await installAegisProjectExtension({ projectRoot, apply: true });
			const dryRun = await uninstallAegisPiExtension({
				projectRoot,
				apply: false,
			});
			expect(dryRun.wouldRemove).toContain(
				".pi/olympi/core/package/olympi-runtime.json",
			);
			expect(dryRun.wouldRemove).toContain(
				".pi/olympi/core/package/shims/rtk-tool-shims.json",
			);
			const applied = await uninstallAegisPiExtension({
				projectRoot,
				apply: true,
			});
			expect(applied.blocked).toBe(false);
			expect(applied.preserved).toEqual([]);
			expect(applied.removed).toContain(
				".pi/olympi/core/package/skills/olympi-goal-loop/SKILL.md",
			);
			expect(applied.removed).toContain(
				".pi/olympi/core/package/prompts/olympi-goal.md",
			);
			expect(applied.removed).toContain(".pi/extensions/olympi-aegis.ts");
			expect(applied.removed).toContain(".pi/settings.json packages entry");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Pi slash commands map workflow requests to scoped skills and prompts", async () => {
		const sent: string[] = [];
		const registered = new Map<
			string,
			(
				args: string,
				ctx: { sendUserMessage: (message: string) => Promise<void> },
			) => unknown
		>();
		createAegisPiExtension({
			on() {
				// Event registration is not under test here.
			},
			registerCommand(name, options) {
				registered.set(name, options.handler);
			},
		});
		expect(registered.has("olympi-goal")).toBe(true);
		expect(registered.has("olympi-resume")).toBe(true);
		expect(registered.has("olympi-context")).toBe(true);
		expect(registered.has("olympi-feedback")).toBe(true);
		const context = {
			sendUserMessage: (message: string) => {
				sent.push(message);
				return Promise.resolve();
			},
		};
		await registered.get("olympi-goal")?.("fix docs", context);
		await registered.get("olympi-resume")?.("goal-123", context);
		await registered.get("olympi-context")?.("packages/cli/src", context);
		expect(sent.join("\n")).toContain("/skill:olympi-goal-loop");
		expect(sent.join("\n")).toContain("Resume the saved goal");
		expect(sent.join("\n")).toContain("/skill:olympi-code-intelligence");
		expect(sent.join("\n")).toContain("route tool execution through RTK");

		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-memory-prompt-"),
		);
		const previousCwd = process.cwd();
		try {
			process.chdir(projectRoot);
			await initializeMemoryStore({ projectRoot, apply: true });
			await registered.get("olympi-goal")?.("use memory", context);
			expect(sent.at(-1)).toContain("Project memory:");
			expect(sent.at(-1)).toContain("Keep user constraints binding");

			await setMemoryEnabled({ projectRoot, apply: true, enabled: false });
			await registered.get("olympi-goal")?.("memory disabled", context);
			expect(sent.at(-1)).not.toContain("Project memory:");
		} finally {
			process.chdir(previousCwd);
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Aegis global install is explicit, gated, and dry-run safe", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-aegis-global-"),
		);
		const homeDir = path.join(tempRoot, "home");
		try {
			const dryRun = await installAegisPiExtension({
				scope: "global",
				homeDir,
				apply: false,
			});
			expect(dryRun.scope).toBe("global");
			expect(dryRun.targetStatePath).toBe(path.join(homeDir, ".pi", "agent"));
			expect(dryRun.wouldWrite).toEqual([
				"~/.pi/agent/extensions/olympi-aegis.ts",
			]);
			expect(dryRun.written).toEqual([]);
			await expect(
				readFile(
					path.join(homeDir, ".pi", "agent", "extensions", "olympi-aegis.ts"),
					"utf8",
				),
			).rejects.toThrow();

			const blocked = await installAegisPiExtension({
				scope: "global",
				homeDir,
				apply: true,
			});
			expect(blocked.blocked).toBe(true);
			expect(blocked.written).toEqual([]);
			expect(blocked.reason).toContain("explicit confirmation provenance");

			const applied = await installAegisPiExtension({
				scope: "global",
				homeDir,
				apply: true,
				confirmed: true,
				provenance: "explicit-user-approval",
			});
			expect(applied.blocked).toBe(false);
			expect(applied.written).toEqual([
				"~/.pi/agent/extensions/olympi-aegis.ts",
			]);
			expect(
				await readFile(
					path.join(homeDir, ".pi", "agent", "extensions", "olympi-aegis.ts"),
					"utf8",
				),
			).toContain("createAegisPiExtension");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("project-local memory store is explicit and toggleable", async () => {
		const projectRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-memory-"));
		try {
			const initial = await readMemoryStatus(projectRoot);
			expect(initial.initialized).toBe(false);
			expect(initial.enabled).toBe(false);

			const dryRun = await initializeMemoryStore({
				projectRoot,
				apply: false,
			});
			expect(dryRun.wouldWrite).toEqual([".pi/olympi/memory/memory.sqlite"]);
			await expect(
				readFile(
					path.join(projectRoot, ".pi", "olympi", "memory", "memory.sqlite"),
				),
			).rejects.toThrow();

			const applied = await initializeMemoryStore({
				projectRoot,
				apply: true,
			});
			expect(applied.written).toEqual([".pi/olympi/memory/memory.sqlite"]);
			const enabled = await readMemoryStatus(projectRoot);
			expect(enabled.enabled).toBe(true);
			expect(enabled.entries).toHaveLength(11);
			expect(await readEnabledMemoryText(projectRoot)).toContain(
				"Keep user constraints binding across all topics. Do not overgeneralize from familiar external models into the user’s project, wording, goals, or context.",
			);

			const db = new Database(
				path.join(projectRoot, ".pi", "olympi", "memory", "memory.sqlite"),
				{ readonly: true },
			);
			try {
				expect(
					db
						.prepare(
							"SELECT COUNT(*) AS count FROM memory_entries WHERE source = 'user-provided'",
						)
						.get(),
				).toEqual({ count: 11 });
			} finally {
				db.close();
			}

			await setMemoryEnabled({ projectRoot, apply: true, enabled: false });
			expect((await readMemoryStatus(projectRoot)).enabled).toBe(false);
			expect(await readEnabledMemoryText(projectRoot)).toEqual([]);

			const cli = Bun.spawn(
				["bun", CLI, "memory", "enable", "--apply", "--json"],
				{ cwd: projectRoot },
			);
			const [stdout, exitCode] = await Promise.all([
				new Response(cli.stdout).text(),
				cli.exited,
			]);
			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout).enabled).toBe(true);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("profile UX is project-local and not provider-renderer profile writes", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-profile-"),
		);
		try {
			const unset = await readProfileStatus(projectRoot);
			expect(unset.profile).toBeNull();
			const report = await setProjectProfile({
				projectRoot,
				name: "Review Mode",
				apply: true,
			});
			expect(report.profile.name).toBe("review-mode");
			expect(report.profile.providerRendererCompatibility).toBe(false);
			expect(report.written).toEqual([".pi/olympi/profile.json"]);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("mutation queue plan serializes shared manifest targets", () => {
		const plan = buildMutationQueuePlan([
			".pi/olympi/olympi-manifest.json",
			".pi/olympi/olympi-manifest.json",
			"packages/cli/src/cli.ts",
		]);
		expect(plan.parallelSafe).toBe(false);
		expect(plan.reasons.join("\n")).toContain("serialized");
	});

	test("developer workflow commands emit JSON", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-product-workflow-cli-"),
		);
		try {
			const commands = [
				["debug", "profile", "status", "--json"],
				[
					"debug",
					"lock",
					"queue",
					".pi/settings.json",
					"packages/x.ts",
					"--json",
				],
				["debug", "resources", "install", "--project", "--dry-run", "--json"],
				[
					"safety",
					"hooks",
					"aegis-install",
					"--project",
					"--dry-run",
					"--json",
				],
			];
			for (const args of commands) {
				const proc = Bun.spawn(["bun", CLI, ...args], { cwd: projectRoot });
				const [stdout, exitCode] = await Promise.all([
					new Response(proc.stdout).text(),
					proc.exited,
				]);
				expect(exitCode).toBe(0);
				expect(JSON.parse(stdout).schemaVersion).toBe(1);
			}
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("CLI install defaults project-local and --global is explicit", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-install-scope-"),
		);
		const projectRoot = path.join(tempRoot, "project");
		const homeDir = path.join(tempRoot, "home");
		await mkdir(projectRoot, { recursive: true });
		try {
			const projectDryRun = Bun.spawn(
				["bun", CLI, "install", "--dry-run", "--json"],
				{ cwd: projectRoot, env: { ...process.env, HOME: homeDir } },
			);
			const [projectStdout, projectExit] = await Promise.all([
				new Response(projectDryRun.stdout).text(),
				projectDryRun.exited,
			]);
			expect(projectExit).toBe(0);
			const projectReport = JSON.parse(projectStdout);
			expect(projectReport.scope).toBe("project-local");
			expect(projectReport.targetStatePath).toContain("olympi-install-scope-");
			expect(projectReport.targetStatePath).toEndWith(
				path.join("project", ".pi"),
			);
			expect(projectReport.written).toEqual([]);
			await expect(
				readFile(
					path.join(homeDir, ".pi", "agent", "extensions", "olympi-aegis.ts"),
					"utf8",
				),
			).rejects.toThrow();

			const globalDryRun = Bun.spawn(
				["bun", CLI, "install", "--global", "--dry-run", "--json"],
				{ cwd: projectRoot, env: { ...process.env, HOME: homeDir } },
			);
			const [globalStdout, globalExit] = await Promise.all([
				new Response(globalDryRun.stdout).text(),
				globalDryRun.exited,
			]);
			expect(globalExit).toBe(0);
			const globalReport = JSON.parse(globalStdout);
			expect(globalReport.scope).toBe("global");
			expect(globalReport.targetStatePath).toEndWith(
				path.join("home", ".pi", "agent"),
			);
			expect(globalReport.written).toEqual([]);

			const globalApply = Bun.spawn(
				["bun", CLI, "install", "--global", "--apply", "--json"],
				{ cwd: projectRoot, env: { ...process.env, HOME: homeDir } },
			);
			const [applyStdout, applyExit] = await Promise.all([
				new Response(globalApply.stdout).text(),
				globalApply.exited,
			]);
			expect(applyExit).toBe(0);
			const applyReport = JSON.parse(applyStdout);
			expect(applyReport.scope).toBe("global");
			expect(applyReport.written).toEqual([
				"~/.pi/agent/extensions/olympi-aegis.ts",
			]);
			expect(
				await readFile(
					path.join(homeDir, ".pi", "agent", "extensions", "olympi-aegis.ts"),
					"utf8",
				),
			).toContain("createAegisPiExtension");

			await rm(path.join(homeDir, ".pi"), { recursive: true, force: true });

			const confirmedGlobalApply = Bun.spawn(
				[
					"bun",
					CLI,
					"install",
					"--global",
					"--apply",
					"--confirm-global",
					"--provenance",
					"explicit-user-approval",
					"--json",
				],
				{ cwd: projectRoot, env: { ...process.env, HOME: homeDir } },
			);
			const [confirmedStdout, confirmedExit] = await Promise.all([
				new Response(confirmedGlobalApply.stdout).text(),
				confirmedGlobalApply.exited,
			]);
			expect(confirmedExit).toBe(0);
			const confirmedReport = JSON.parse(confirmedStdout);
			expect(confirmedReport.scope).toBe("global");
			expect(confirmedReport.written).toEqual([
				"~/.pi/agent/extensions/olympi-aegis.ts",
			]);
			expect(
				await readFile(
					path.join(homeDir, ".pi", "agent", "extensions", "olympi-aegis.ts"),
					"utf8",
				),
			).toContain("createAegisPiExtension");
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
