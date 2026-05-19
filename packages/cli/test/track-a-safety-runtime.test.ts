import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	AEGIS_EXTENSION_MANIFEST,
	aegisPolicyStatus,
	createAegisPiExtension,
} from "extensions";
import {
	appendHestiaAudit,
	auditRecordFromDecision,
	decidePolicy,
	loadQuotaStatus,
	runSandboxProbe,
	validateBrokerRequest,
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
		expect(decision.requiredNextAction).toContain("manifest");
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
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-hestia-"),
		);
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
			path.join(os.tmpdir(), "olympus-quota-a-"),
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

	test("Aegis skeleton is Olympus-owned and non-executing", () => {
		expect(AEGIS_EXTENSION_MANIFEST.olympusOwned).toBe(true);
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
				expect(name).toBe("olympus-aegis-status");
			},
		});
		expect(handlers.has("tool_call")).toBe(true);
		const result = handlers.get("tool_call")?.(
			{ toolName: "bash", input: { command: "rm -rf ~/.pi" } },
			{ hasUI: false },
		);
		expect(result).toEqual(expect.objectContaining({ block: true }));
	});

	test("executable trust proof requires manifest, lock, signature, and sandbox gates", async () => {
		const projectRoot = await mkdtemp(
			path.join(os.tmpdir(), "olympus-trust-proof-"),
		);
		try {
			await mkdir(path.join(projectRoot, ".pi", "olympus"), {
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
				path.join(projectRoot, ".pi", "olympus", "olympus-manifest.json"),
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
							mirrorRoot: ".pi/olympus/packages/pkg",
							settingsSource: ".pi/olympus/packages/pkg",
							settingsEntryHash: "sha256:settings",
							resources,
							files: [],
						},
					],
				}),
			);
			await writeFile(
				path.join(projectRoot, ".pi", "olympus", "olympus.lock"),
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
			path.join(os.tmpdir(), "olympus-track-a-cli-"),
		);
		try {
			const goodBroker = path.join(tempRoot, "broker.json");
			await writeFile(
				goodBroker,
				'{"schemaVersion":1,"kind":"git","operation":"status","args":{"path":"."}}\n',
			);
			const commands = [
				["safety", "check", "--json"],
				["hooks", "policy", "--json"],
				["sandbox", "check", "--json"],
				["broker", "validate", goodBroker, "--json"],
				["trust", "status", "--json"],
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
			path.join(os.tmpdir(), "olympus-track-a-home-"),
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
