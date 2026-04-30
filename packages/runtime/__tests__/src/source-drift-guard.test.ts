import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluateSourceDriftGuard } from "@openagentlayer/runtime";
import { createFixtureRoot } from "@openagentlayer/testkit";
import { writeForgedManifest, writeManagedManifest } from "../_helpers/runtime";

describe("OAL source drift guard runtime policy", () => {
	test("allows clean manifest", async () => {
		const root = await createFixtureRoot();
		await writeFile(join(root, "managed.txt"), "clean\n");
		const manifestPath = await writeManagedManifest(root, "clean\n");

		const decision = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("allow");
	});

	test("denies missing and changed files", async () => {
		const root = await createFixtureRoot();
		const manifestPath = await writeManagedManifest(root, "expected\n");

		const missing = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});
		await writeFile(join(root, "managed.txt"), "changed\n");
		const changed = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(missing.decision).toBe("deny");
		expect(changed.decision).toBe("deny");
	});

	test("discovers managed manifests from cwd", async () => {
		const root = await createFixtureRoot();
		await writeFile(join(root, "managed.txt"), "clean\n");
		await writeManagedManifest(root, "clean\n");

		const decision = await evaluateSourceDriftGuard({
			cwd: root,
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("allow");
	});

	test("denies missing manifest", async () => {
		const root = await createFixtureRoot();

		const decision = await evaluateSourceDriftGuard({
			metadata: {
				manifest_path: join(root, ".oal/manifest/codex-project.json"),
				target_root: root,
			},
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("deny");
	});

	test("rejects escaping manifest paths and ignores forged target root", async () => {
		const root = await createFixtureRoot();
		const forgedRoot = await createFixtureRoot();
		const manifestPath = await writeForgedManifest(root, forgedRoot);

		const decision = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("deny");
		expect(decision.context?.["issues"]).toContain(
			"path-escape:..\\escape.txt",
		);
	});
});
