import { spawn } from "node:child_process";
import type {
	AgentRunInput,
	AgentRunResult,
	SymphonyAgentRunner,
	SymphonyConfig,
} from "../types";

export class CodexCommandRunner implements SymphonyAgentRunner {
	async run(input: AgentRunInput): Promise<AgentRunResult> {
		const started = Date.now();
		try {
			await runShellWithInput(
				input.config.codex.command,
				input.workspace.path,
				input.prompt,
				input.config.codex.turn_timeout_ms,
			);
			return {
				status: "succeeded",
				runtime_seconds: (Date.now() - started) / 1000,
			};
		} catch (error) {
			return {
				status: String(error).includes("timed out") ? "timed_out" : "failed",
				error: String(error),
				runtime_seconds: (Date.now() - started) / 1000,
			};
		}
	}
}

export function codexLaunchCommand(config: SymphonyConfig): {
	command: string;
	args: string[];
} {
	return { command: "bash", args: ["-lc", config.codex.command] };
}

async function runShellWithInput(
	script: string,
	cwd: string,
	input: string,
	timeoutMs: number,
): Promise<void> {
	await new Promise<void>((resolvePromise, reject) => {
		const child = spawn("bash", ["-lc", script], {
			cwd,
			stdio: ["pipe", "ignore", "ignore"],
		});
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`Command timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		child.stdin.end(input);
		child.on("exit", (code) => {
			clearTimeout(timeout);
			if (code === 0) resolvePromise();
			else reject(new Error(`Command failed with exit code ${code}`));
		});
		child.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}
