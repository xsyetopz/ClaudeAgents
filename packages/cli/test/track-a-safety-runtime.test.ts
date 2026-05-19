import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	AEGIS_EXTENSION_MANIFEST,
	aegisPolicyStatus,
	createAegisPiExtension,
	policyEventFromPi,
} from "extensions";
import {
	appendHestiaAudit,
	auditRecordFromDecision,
	classifyWorkspaceCommand,
	commandClassPolicy,
	decidePolicy,
	loadQuotaStatus,
	normalizeCommandExecution,
	runSandboxProbe,
	validateBrokerRequest,
	workspaceOwnershipHook,
} from "safety";
import {
	buildExecutableTrustProof,
	executableSignatureSubjectDigest,
} from "trust";

const CLI = path.join(import.meta.dir, "..", "src", "cli.ts");

describe("Track A Themis policy decisions", () => {
	test("unsafe tool_call is blocked", () => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "bash",
			operation: "execute",
			command: "rm -rf ~/.pi",
		});
		expect(decision.decision).toBe("block");
		expect(decision.reasons.join("\n")).toContain("recursive force delete");
	});

	test("protected path operation is blocked", () => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "read",
			operation: "read",
			path: "~/.ssh/id_rsa",
		});
		expect(decision.blocked).toBe(true);
		expect(decision.reasons.join("\n")).toContain("protected path denied");
	});

	test("generated artifact write is blocked without manifest", () => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "write",
			operation: "write",
			path: "generated/out.md",
			generatedArtifact: true,
			manifestOwned: false,
		});
		expect(decision.blocked).toBe(true);
		expect(decision.requiredNextAction).toContain("ownership");
	});

	test("secret output is redacted before policy summaries", () => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_result",
			text: "token=sk-1234567890abcdef",
		});
		expect(decision.decision).toBe("redact");
		expect(decision.redactions.length).toBeGreaterThan(0);
		expect(decision.redactedText).toContain("[REDACTED:");
		expect(decision.redactedText).not.toContain("sk-1234567890abcdef");
	});

	test("before_provider_request warning and audit work without raw secrets", async () => {
		const projectRoot = await mkdtemp(path.join(os.tmpdir(), "olympi-hestia-"));
		try {
			const decision = decidePolicy({
				schemaVersion: 1,
				eventType: "before_provider_request",
				payloadBytes: 150_000,
				quotaPressure: true,
				text: "api_key=sk-1234567890abcdef",
			});
			expect(decision.decision).toBe("warn");
			const auditPath = await appendHestiaAudit(
				projectRoot,
				auditRecordFromDecision(decision),
			);
			const audit = await readFile(auditPath, "utf8");
			expect(audit).toContain("provider-payload");
			expect(audit).not.toContain("sk-1234567890abcdef");
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("unsigned warning and lock mismatch blocks executable load", () => {
		const unsigned = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "extension-load",
			trust: { unsigned: true, homeDenied: true, networkDenied: true },
		});
		expect(unsigned.decision).toBe("warn");
		expect(unsigned.reasons).toContain("unsigned package warning");
		const mismatch = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "extension-load",
			packageExecutable: true,
			trust: {
				executable: true,
				hashMismatch: true,
				locked: true,
				sandboxReady: false,
				homeDenied: true,
				networkDenied: true,
			},
		});
		expect(mismatch.blocked).toBe(true);
		expect(mismatch.reasons.join("\n")).toContain("hash mismatch");
	});

	test("ambiguous project settings cannot be restored without ownership proof", () => {
		const classified = classifyWorkspaceCommand(
			"git checkout HEAD -- .pi/settings.json",
		);
		expect(classified.operation).toBe("revert");
		expect(classified.primaryClass).toBe("revert-like");
		expect(classified.policy.allowedPreconditions.join("\n")).toContain(
			"proves the pre-change state",
		);
		expect(classified.requiresOwnershipProof).toBe(true);

		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "shell",
			operation: "execute",
			command: "git checkout HEAD -- .pi/settings.json",
			workspace: {
				operation: "revert",
				paths: [".pi/settings.json"],
				proof: "unknown",
				ambiguous: true,
			},
		});

		expect(decision.blocked).toBe(true);
		expect(decision.commandClassification?.primaryClass).toBe("revert-like");
		expect(decision.commandClassification?.blockerBehavior).toContain("block");
		expect(decision.reasons.join("\n")).toContain("ambiguous workspace");
		expect(decision.requiredNextAction).toContain("ownership");
	});

	test("semantic command classes expose preconditions and audit output", () => {
		const readOnly = classifyWorkspaceCommand("git status --short");
		expect(readOnly.primaryClass).toBe("read-only-inspection");
		expect(readOnly.writesWorkspace).toBe(false);

		const stagingPolicy = commandClassPolicy("staging");
		expect(stagingPolicy.allowedPreconditions.join("\n")).toContain(
			"unintended diff is absent",
		);
		expect(stagingPolicy.auditOutput).toContain("ownership proof");
	});

	test("common repo command mappers classify safe and unsafe commands", () => {
		expect(
			classifyWorkspaceCommand("git diff -- packages/safety").primaryClass,
		).toBe("read-only-inspection");
		expect(classifyWorkspaceCommand("git stash push").primaryClass).toBe(
			"revert-like",
		);
		expect(classifyWorkspaceCommand("cp a b").primaryClass).toBe(
			"formatting-write",
		);
		expect(classifyWorkspaceCommand("bun run typecheck").primaryClass).toBe(
			"read-only-inspection",
		);
		expect(classifyWorkspaceCommand("bun run biome:format").primaryClass).toBe(
			"formatting-write",
		);
	});

	test("complex shell forms require review instead of silent allow", () => {
		for (const command of [
			"cat package.json | head",
			"echo $(git status)",
			"git status > out.txt",
			"git status && rm file.txt",
			"find . -exec rm {} ;",
			"ls *.ts",
		]) {
			const decision = decidePolicy({
				schemaVersion: 1,
				eventType: "tool_call",
				toolName: "shell",
				operation: "execute",
				command,
			});

			expect(decision.blocked).toBe(true);
			expect(decision.commandClassification?.complexShell).toBe(true);
		}

		const envReadOnly = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "shell",
			operation: "execute",
			command: "NO_COLOR=1 git status --short",
		});
		expect(envReadOnly.blocked).toBe(false);
		expect(envReadOnly.commandClassification?.primaryClass).toBe(
			"read-only-inspection",
		);
	});

	test("unknown command policy allows only non-mutating unambiguous shapes", () => {
		const harmlessUnknown = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "shell",
			operation: "execute",
			command: "custom-status",
		});
		expect(harmlessUnknown.blocked).toBe(false);

		const mutatingUnknown = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "shell",
			operation: "execute",
			command: "custom-tool write .pi/settings.json",
			workspace: { paths: [".pi/settings.json"], ambiguous: true },
		});
		expect(mutatingUnknown.blocked).toBe(true);
		expect(mutatingUnknown.reasons.join("\n")).toContain(
			"possible mutation indicators",
		);
	});

	test("broad formatter cannot rewrite user-owned files", () => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "shell",
			operation: "execute",
			command: "bun run biome:format",
			workspace: {
				operation: "format",
				paths: [],
				proof: "unknown",
				userOwned: true,
			},
		});

		expect(decision.blocked).toBe(true);
		expect(decision.commandClassification?.primaryClass).toBe(
			"formatting-write",
		);
		expect(decision.reasons.join("\n")).toContain("user-owned");
		expect(decision.reasons.join("\n")).toContain("broad formatter");
	});

	test("agent-owned generated file can be reverted with provenance proof", () => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "shell",
			operation: "execute",
			command: "git restore -- .pi/olympi/reports/status.json",
			manifestOwned: true,
			workspace: {
				operation: "revert",
				paths: [".pi/olympi/reports/status.json"],
				proof: "provenance-record",
				ambiguous: false,
				generated: true,
			},
		});

		expect(decision.blocked).toBe(false);
		expect(decision.commandClassification?.classes).toContain(
			"generated-artifact",
		);
		expect(decision.decision).toBe("warn");
		expect(decision.reasons.join("\n")).toContain("revert-like");
	});

	test("ambiguous write, staging, and commit actions are blocked", () => {
		const writeDecision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "write",
			operation: "write",
			path: ".pi/settings.json",
			workspace: {
				operation: "write",
				paths: [".pi/settings.json"],
				proof: "unknown",
				ambiguous: true,
			},
		});
		expect(writeDecision.blocked).toBe(true);
		expect(writeDecision.commandClassification?.primaryClass).toBe(
			"formatting-write",
		);

		for (const command of [
			"git add .pi/settings.json",
			"git commit -m guard",
		]) {
			const decision = decidePolicy({
				schemaVersion: 1,
				eventType: "tool_call",
				toolName: "shell",
				operation: "execute",
				command,
				workspace: {
					paths: [".pi/settings.json"],
					proof: "unknown",
					ambiguous: true,
				},
			});

			expect(decision.blocked).toBe(true);
			expect(decision.commandClassification?.requiresOwnershipProof).toBe(true);
		}
	});

	test("workspace ownership hook vetoes restore-like operations", () => {
		const hook = workspaceOwnershipHook();
		const result = hook.run({
			schemaVersion: 1,
			phase: "pre-action",
			toolName: "shell",
			command: "git restore .pi/settings.json",
			workspace: {
				operation: "revert",
				paths: [".pi/settings.json"],
				proof: "unknown",
				ambiguous: true,
			},
		});

		expect(result.decision).toBe("veto");
		expect(result.requiredNextAction).toContain("prove ownership");
	});

	test("command wrapper normalizes metadata before direct policy", () => {
		const normalized = normalizeCommandExecution({
			rawCommand: "git restore -- .pi/settings.json",
			cwd: path.join(os.tmpdir(), "olympi-policy-fixture"),
			candidateTouchedPaths: [".pi/settings.json"],
		});

		expect(normalized.executable).toBe("git");
		expect(normalized.argv).toContain("restore");
		expect(normalized.revert).toBe(true);
		expect(normalized.policyDecision.blocked).toBe(true);
		expect(normalized.blockerReason).toContain("ownership");
	});

	test("CLI safety check exposes wrapper-normalized command metadata", async () => {
		const proc = Bun.spawn(["bun", CLI, "safety", "check", "--json"]);
		const [stdout, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			proc.exited,
		]);
		expect(exitCode).toBe(0);
		const report = JSON.parse(stdout);
		expect(report.normalizedCommand.executable).toBe("git");
		expect(
			report.normalizedCommand.policyDecision.commandClassification,
		).toBeDefined();
	});
});

describe("Track A sandbox, broker, quota, and Aegis", () => {
	test("sandbox fake-home secret probes are denied", () => {
		const report = runSandboxProbe({ PATH: "" });
		expect(report.executableLoadAllowed).toBe(false);
		for (const secretPath of [
			"~/.ssh/id_rsa",
			"~/.config/gh/hosts.yml",
			"~/.pi/agent/auth.json",
		]) {
			expect(
				report.fakeHomeProbes.find((probe) => probe.path === secretPath)
					?.denied,
			).toBe(true);
		}
	});

	test("broker denies arbitrary shell and permits approved read-only schema", () => {
		const denied = validateBrokerRequest({
			schemaVersion: 1,
			kind: "git",
			operation: "status",
			args: { shell: "rm -rf ." },
		});
		expect(denied.valid).toBe(false);
		expect(denied.reasons.join("\n")).toContain("shell");
		const allowed = validateBrokerRequest({
			schemaVersion: 1,
			kind: "gh",
			operation: "pr-view",
			args: { number: 123 },
		});
		expect(allowed.valid).toBe(true);
		expect(allowed.readOnly).toBe(true);
	});

	test("quota pressure warning does not invent limits", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-quota-a-"),
		);
		try {
			const quota = await loadQuotaStatus(projectRoot);
			expect(quota.limits).toBe("unknown");
			const decision = decidePolicy({
				schemaVersion: 1,
				eventType: "before_provider_request",
				quotaPressure: true,
			});
			expect(decision.reasons.join("\n")).toContain(
				"without inventing provider limits",
			);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});

	test("Aegis skeleton is Olympi-owned and non-executing", () => {
		expect(AEGIS_EXTENSION_MANIFEST.olympiOwned).toBe(true);
		expect(AEGIS_EXTENSION_MANIFEST.thirdPartyCodeExecution).toBe(false);
		const status = aegisPolicyStatus();
		expect(status.runtimeExecutionEnabled).toBe(false);
		expect(status.subscribedEvents).toContain("tool_call");
	});

	test("Aegis Pi runtime registers live fail-closed tool_call policy", () => {
		const handlers = new Map<
			string,
			(event: unknown, ctx: unknown) => unknown
		>();
		createAegisPiExtension({
			on(event, handler) {
				handlers.set(
					event,
					handler as (event: unknown, ctx: unknown) => unknown,
				);
			},
			registerCommand(name) {
				expect(name).toBe("olympi-aegis-status");
			},
		});
		expect(handlers.has("tool_call")).toBe(true);
		const result = handlers.get("tool_call")?.(
			{ toolName: "bash", input: { command: "rm -rf ~/.pi" } },
			{ hasUI: false },
		);
		expect(result).toEqual(expect.objectContaining({ block: true }));
	});

	test("provider metadata fallback blocks unsafe events with missing metadata", async () => {
		const missingCommand = policyEventFromPi("tool_call", {
			toolName: "bash",
			input: {},
		});
		const commandDecision = decidePolicy(missingCommand);
		expect(commandDecision.blocked).toBe(true);
		expect(commandDecision.blocker?.missingFields).toContain("command");
		expect(commandDecision.blocker?.preventedOperation).toBe("execute");

		const missingPath = policyEventFromPi("tool_call", {
			toolName: "write",
			input: { content: "x" },
		});
		const pathDecision = decidePolicy(missingPath);
		expect(pathDecision.blocked).toBe(true);
		expect(pathDecision.blocker?.missingFields).toContain("path");
		expect(pathDecision.requiredNextAction).toContain("wrapper");

		const readOnly = policyEventFromPi("tool_call", {
			toolName: "read",
			input: {},
		});
		expect(decidePolicy(readOnly).blocked).toBe(false);

		const fixture = JSON.parse(
			await readFile(
				path.join(
					import.meta.dir,
					"fixtures",
					"trace-missing-provider-metadata.json",
				),
				"utf8",
			),
		);
		expect(fixture.eventShape).toContain("input.content");
		expect(fixture.expectedBlocker.missingFields).toContain("path");
	});

	test("executable trust proof requires manifest, lock, signature, and sandbox gates", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-trust-proof-"),
		);
		try {
			await mkdir(path.join(projectRoot, ".pi", "olympi"), {
				recursive: true,
			});
			const resources = [
				{
					id: "extension:policy",
					kind: "extension",
					path: "extensions/policy.ts",
					hash: "sha256:resource",
				},
			];
			await writeFile(
				path.join(projectRoot, ".pi", "olympi", "olympi-manifest.json"),
				JSON.stringify({
					schemaVersion: 1,
					packages: [
						{
							packageId: "pkg",
							installedAt: "2026-05-18T00:00:00.000Z",
							source: ".",
							package: {
								name: "pkg",
								version: "1.0.0",
								sourceType: "local",
								source: ".",
								contentDigest: "sha256:content",
							},
							mirrorRoot: ".pi/olympi/packages/pkg",
							settingsSource: ".pi/olympi/packages/pkg",
							settingsEntryHash: "sha256:settings",
							resources,
							files: [],
						},
					],
				}),
			);
			await writeFile(
				path.join(projectRoot, ".pi", "olympi", "olympi.lock"),
				JSON.stringify({
					schemaVersion: 1,
					packages: [
						{
							packageId: "pkg",
							contentDigest: "sha256:content",
							decision: "trusted-executable",
						},
					],
				}),
			);
			const signatureDigest = executableSignatureSubjectDigest({
				packageId: "pkg",
				contentDigest: "sha256:content",
				resources,
			});
			const proof = await buildExecutableTrustProof("pkg", {
				projectRoot,
				signatureDigest,
				sandboxReady: true,
			});
			expect(proof.executableLoadAllowed).toBe(true);
		} finally {
			await rm(projectRoot, { recursive: true, force: true });
		}
	});
});

describe("Track A CLI smoke and no global Pi writes", () => {
	test("low-level CLI safety commands emit JSON", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-track-a-cli-"),
		);
		try {
			const goodBroker = path.join(tempRoot, "broker.json");
			await writeFile(
				goodBroker,
				'{"schemaVersion":1,"kind":"git","operation":"status","args":{"path":"."}}\n',
			);
			const commands = [
				["safety", "check", "--json"],
				["safety", "hooks", "policy", "--json"],
				["safety", "sandbox", "check", "--json"],
				["safety", "broker", "validate", goodBroker, "--json"],
				["safety", "trust", "status", "--json"],
			];
			for (const args of commands) {
				const proc = Bun.spawn(["bun", CLI, ...args], { cwd: tempRoot });
				const [stdout, exitCode] = await Promise.all([
					new Response(proc.stdout).text(),
					proc.exited,
				]);
				expect([0, 1]).toContain(exitCode);
				expect(JSON.parse(stdout).schemaVersion).toBe(1);
			}
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test("safety commands do not write to HOME ~/.pi by default", async () => {
		const tempRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympi-track-a-home-"),
		);
		try {
			const fakeHome = path.join(tempRoot, "fake-home");
			const proc = Bun.spawn(["bun", CLI, "safety", "check", "--json"], {
				cwd: tempRoot,
				env: { ...process.env, HOME: fakeHome },
			});
			const exitCode = await proc.exited;
			expect(exitCode).toBe(0);
			await expect(
				readFile(path.join(fakeHome, ".pi", "settings.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
