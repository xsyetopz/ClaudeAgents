import { statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { decidePolicy } from "../policy/themis";

export type SandboxStatus = "ready" | "degraded" | "blocked";

export interface SandboxSecretProbe {
	path: string;
	denied: boolean;
	reason: string;
}

export interface SandboxProbeReport {
	schemaVersion: 1;
	command: "sandbox check";
	platform: NodeJS.Platform;
	isWsl2: boolean;
	bwrap: {
		available: boolean;
		path: string | null;
	};
	status: SandboxStatus;
	executableLoadAllowed: false;
	fakeHomeProbes: SandboxSecretProbe[];
	warnings: string[];
}

const FAKE_SECRET_PATHS = [
	"~/.ssh/id_rsa",
	"~/.config/gh/hosts.yml",
	"~/.pi/agent/auth.json",
];

export function runSandboxProbe(
	env: NodeJS.ProcessEnv = process.env,
): SandboxProbeReport {
	const bwrapPath = findOnPath("bwrap", env["PATH"] ?? "");
	const isWsl2 = detectWsl2();
	const platform = process.platform;
	const fakeHomeProbes = FAKE_SECRET_PATHS.map((secretPath) => {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "read",
			operation: "read",
			path: secretPath,
		});
		return {
			path: secretPath,
			denied: decision.blocked,
			reason: decision.reasons.join("; "),
		};
	});
	const warnings: string[] = [];
	if (platform === "darwin")
		warnings.push(
			"macOS sandbox backend is not implemented; executable loads remain blocked.",
		);
	if (platform === "linux" && bwrapPath === null)
		warnings.push(
			"Linux bwrap not found on PATH; executable loads remain blocked.",
		);
	if (isWsl2 && bwrapPath === null)
		warnings.push(
			"WSL2 detected without bwrap; executable loads remain blocked.",
		);
	return {
		schemaVersion: 1,
		command: "sandbox check",
		platform,
		isWsl2,
		bwrap: { available: bwrapPath !== null, path: bwrapPath },
		status: platform === "linux" && bwrapPath !== null ? "degraded" : "blocked",
		executableLoadAllowed: false,
		fakeHomeProbes,
		warnings,
	};
}

function findOnPath(binary: string, pathValue: string): string | null {
	for (const directory of pathValue.split(path.delimiter)) {
		if (directory.length === 0) continue;
		const candidate = path.join(directory, binary);
		try {
			const stat = statSync(candidate);
			if (stat.isFile() && (stat.mode & 0o111) !== 0) return candidate;
		} catch {
			// continue PATH search without side effects
		}
	}
	return null;
}

function detectWsl2(): boolean {
	return os.release().toLowerCase().includes("microsoft");
}
