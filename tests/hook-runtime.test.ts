import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { repoRoot } from "./helpers/oal";

const destructiveRuntime = resolve(
	repoRoot,
	"source/hooks/runtime/tool-pre-destructive-command.mjs",
);

describe("destructive command hook runtime", () => {
	test.each([
		"rm -rf /tmp/build",
		"FOO=1 rm -rf /tmp/build",
		"rm -R build",
		"git reset --hard",
		"FOO=1 git reset --hard",
		"git -C repo reset --hard",
		"git clean -fd",
		"git push --force",
		"git push --force-with-lease",
		"git restore .",
		"git checkout -- .",
		"chmod -R 777 build",
		"sudo FOO=1 chmod -R 777 build",
		"chown -R user build",
		"dd if=image.img of=/dev/disk2",
		"mkfs.ext4 /dev/sdb1",
		"diskutil eraseDisk APFS Test disk2",
	])("blocks %s", (command) => {
		const completedProcess = runRuntime(command);
		expect(completedProcess.status).toBe(0);
		expect(completedProcess.stderr).toBe("");
		expect(JSON.parse(completedProcess.stdout)).toMatchObject({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
			},
		});
	});

	test.each([
		"rm file.txt",
		"git status",
		"chmod 644 file.txt",
		"echo ok",
	])("allows %s", (command) => {
		const completedProcess = runRuntime(command);
		expect(completedProcess.status).toBe(0);
		expect(completedProcess.stderr).toBe("");
		expect(completedProcess.stdout).toBe("");
	});
});

function runRuntime(command: string) {
	const completedProcess = spawnSync("node", [destructiveRuntime], {
		encoding: "utf8",
		input: JSON.stringify({ tool_input: { command } }),
	});
	return {
		status: completedProcess.status,
		stderr: completedProcess.stderr,
		stdout: completedProcess.stdout,
	};
}
