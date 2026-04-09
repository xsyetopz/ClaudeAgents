import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolvePaths } from "../scripts/install/shared.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("shared install paths", () => {
	it("resolves Windows managed paths under AppData and user home", () => {
		const paths = resolvePaths({
			platform: "win32",
			env: { APPDATA: "C:\\Users\\krystian\\AppData\\Roaming" },
			homeDir: "C:\\Users\\krystian",
		});
		assert.equal(
			paths.configDir,
			"C:\\Users\\krystian\\AppData\\Roaming\\openagentsbtw",
		);
		assert.equal(
			paths.opencodeConfigDir,
			"C:\\Users\\krystian\\AppData\\Roaming\\opencode",
		);
		assert.equal(
			paths.vscodeUserMcp,
			"C:\\Users\\krystian\\AppData\\Roaming\\Code\\User\\mcp.json",
		);
		assert.equal(paths.claudeHome, "C:\\Users\\krystian\\.claude");
		assert.equal(paths.codexHome, "C:\\Users\\krystian\\.codex");
		assert.equal(paths.copilotHome, "C:\\Users\\krystian\\.copilot");
	});

	it("keeps Unix managed paths under XDG plus ~/.local/bin", () => {
		const paths = resolvePaths({
			platform: "linux",
			env: { XDG_CONFIG_HOME: "/tmp/xdg" },
			homeDir: "/home/krystian",
		});
		assert.equal(paths.configDir, "/tmp/xdg/openagentsbtw");
		assert.equal(paths.managedBinDir, "/home/krystian/.local/bin");
		assert.equal(paths.ctx7Wrapper, "/home/krystian/.local/bin/ctx7");
		assert.equal(paths.opencodeConfigDir, "/tmp/xdg/opencode");
	});
});

describe("public entrypoints", () => {
	it("keeps shell wrappers thin and pointing at shared Node CLIs", () => {
		assert.match(readRepo("install.sh"), /scripts\/install\/cli\.mjs/);
		assert.match(readRepo("config.sh"), /scripts\/install\/config-cli\.mjs/);
		assert.match(
			readRepo("uninstall.sh"),
			/scripts\/install\/uninstall-cli\.mjs/,
		);
		assert.match(readRepo("build-plugin.sh"), /scripts\/build-plugin-cli\.mjs/);
	});

	it("ships matching PowerShell wrappers for all root entrypoints", () => {
		assert.match(readRepo("install.ps1"), /scripts\/install\/cli\.mjs/);
		assert.match(readRepo("config.ps1"), /scripts\/install\/config-cli\.mjs/);
		assert.match(
			readRepo("uninstall.ps1"),
			/scripts\/install\/uninstall-cli\.mjs/,
		);
		assert.match(
			readRepo("build-plugin.ps1"),
			/scripts\/build-plugin-cli\.mjs/,
		);
		assert.match(readRepo("install.ps1"), /Set-StrictMode -Version Latest/);
		assert.match(readRepo("build-plugin.ps1"), /\$LASTEXITCODE/);
	});
});
