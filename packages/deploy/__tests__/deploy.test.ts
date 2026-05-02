import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyDeploy, planDeploy, uninstall } from "../src";

test("deploy plan dry-run data precedes apply and uninstall removes ownership only", async () => {
	const root = await mkdtemp(join(tmpdir(), "oal-deploy-test-"));
	const artifact = {
		provider: "codex" as const,
		path: ".codex/openagentlayer/owned.txt",
		content: "owned\n",
		sourceId: "test:owned",
		mode: "file" as const,
	};
	const plan = await planDeploy(root, [artifact]);
	expect(plan.changes).toEqual([
		{ action: "write", path: artifact.path, reason: "new managed artifact" },
	]);
	await applyDeploy(plan);
	expect(await readFile(join(root, artifact.path), "utf8")).toBe("owned\n");
	await uninstall(root, "codex");
	const after = await planDeploy(root, [artifact]);
	expect(after.changes[0]?.action).toBe("write");
	await rm(root, { recursive: true, force: true });
});
