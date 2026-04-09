import { spawn, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(__filename), "..", "..");

export const PATHS = {
	configDir: path.join(os.homedir(), ".config", "openagentsbtw"),
	configEnvFile: path.join(
		os.homedir(),
		".config",
		"openagentsbtw",
		"config.env",
	),
	globalRtkMd: path.join(os.homedir(), ".config", "openagentsbtw", "RTK.md"),
	ctx7Wrapper: path.join(os.homedir(), ".local", "bin", "ctx7"),
	codexConfig: path.join(os.homedir(), ".codex", "config.toml"),
};

export function logInfo(message) {
	console.log(`  ✓ ${message}`);
}

export function logWarn(message) {
	console.warn(`  ! ${message}`);
}

export function fail(message) {
	throw new Error(message);
}

export async function pathExists(filepath) {
	try {
		await fs.stat(filepath);
		return true;
	} catch {
		return false;
	}
}

export async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

export async function readText(filepath, fallback = "") {
	try {
		return await fs.readFile(filepath, "utf8");
	} catch {
		return fallback;
	}
}

export async function writeText(filepath, content, executable = false) {
	await ensureDir(path.dirname(filepath));
	await fs.writeFile(
		filepath,
		content.endsWith("\n") ? content : `${content}\n`,
	);
	if (executable) {
		await fs.chmod(filepath, 0o755);
	}
}

export function commandExists(command) {
	const result = spawnSync(
		"sh",
		["-lc", `command -v ${command} >/dev/null 2>&1`],
		{
			stdio: "ignore",
		},
	);
	return result.status === 0;
}

export function resolveJsRunner() {
	if (commandExists("bunx")) return "bunx";
	if (commandExists("bun")) return "bunx-fallback";
	if (commandExists("pnpm")) return "pnpm";
	if (commandExists("yarn")) return "yarn";
	if (commandExists("npx")) return "npx";
	if (commandExists("npm")) return "npm-npx";
	return "none";
}

export function ctx7RunnerLine() {
	const runner = resolveJsRunner();
	switch (runner) {
		case "bunx":
			return 'exec bunx -y ctx7 "$@"';
		case "bunx-fallback":
			return 'exec bun x -y ctx7 "$@"';
		case "pnpm":
			return 'exec pnpm dlx ctx7 "$@"';
		case "yarn":
			return 'if yarn dlx --help >/dev/null 2>&1; then exec yarn dlx ctx7 "$@"; fi';
		case "none":
			return 'echo "Error: no JS package runner found for ctx7 (need bun, pnpm, yarn, or npm)." >&2; exit 1';
		default:
			return 'exec npx -y ctx7 "$@"';
	}
}

export async function loadConfigEnv() {
	const text = await readText(PATHS.configEnvFile, "");
	const env = {};
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const [key, ...valueParts] = trimmed.split("=");
		if (!key) continue;
		env[key] = valueParts.join("=");
	}
	return env;
}

export async function writeConfigEnv(values) {
	await ensureDir(PATHS.configDir);
	const lines = ["# Managed by openagentsbtw"];
	if (values.CONTEXT7_API_KEY) {
		lines.push(`CONTEXT7_API_KEY=${values.CONTEXT7_API_KEY}`);
	}
	await writeText(PATHS.configEnvFile, `${lines.join("\n")}\n`);
}

export async function promptToggle(
	question,
	defaultYes,
	nonInteractive = false,
) {
	if (nonInteractive) return defaultYes;
	const suffix = defaultYes ? "[Y/n]" : "[y/N]";
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = (await rl.question(`  ${question} ${suffix} `)).trim();
		if (!answer) return defaultYes;
		return /^y/i.test(answer);
	} finally {
		rl.close();
	}
}

export async function promptText(
	question,
	nonInteractive = false,
	fallback = "",
) {
	if (nonInteractive) return fallback;
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		return (await rl.question(`  ${question} `)).trim();
	} finally {
		rl.close();
	}
}

export async function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: options.stdio ?? "inherit",
			cwd: options.cwd,
			env: options.env ? { ...process.env, ...options.env } : process.env,
		});
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new Error(
					`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
				),
			);
		});
		child.on("error", reject);
	});
}

export async function capture(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "pipe", "pipe"],
			cwd: options.cwd,
			env: options.env ? { ...process.env, ...options.env } : process.env,
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("exit", (code) => {
			resolve({ code: code ?? 1, stdout, stderr });
		});
		child.on("error", reject);
	});
}

export function parseKeyValueList(entries) {
	const output = [];
	for (const entry of entries) {
		const separator = entry.indexOf("=");
		if (separator === -1) {
			fail(`Expected KEY=VALUE entry, received: ${entry}`);
		}
		output.push([entry.slice(0, separator), entry.slice(separator + 1)]);
	}
	return output;
}

export function parseBooleanFlag(argv, flag) {
	return argv.includes(flag);
}

export function parseStringFlag(argv, flag, fallback = "") {
	const index = argv.indexOf(flag);
	if (index === -1) return fallback;
	return argv[index + 1] ?? fallback;
}
