#!/usr/bin/env bun
const policyId = "destructive-command-guard";
const destructiveCommandPatterns = [
	/\brm\s+-rf\b/u,
	/\brm\s+-fr\b/u,
	/\bgit\s+reset\s+--hard\b/u,
	/\bgit\s+clean\s+-fd\b/u,
	/\bsudo\s+rm\b/u,
	/\bchmod\s+-R\s+777\b/u,
	/>\s*\/dev\/(disk|rdisk)/u,
];

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) {
		text += chunk;
	}
	return text.trim() === "" ? {} : JSON.parse(text);
}

function extractCommand(payload) {
	if (typeof payload?.command === "string") {
		return payload.command;
	}
	const input = payload?.tool_input;
	if (input && typeof input === "object") {
		if (typeof input.command === "string") {
			return input.command;
		}
		if (typeof input.cmd === "string") {
			return input.cmd;
		}
	}
	return "";
}

function evaluate(payload) {
	const command = extractCommand(payload);
	if (command === "") {
		return {
			decision: "allow",
			policy_id: policyId,
			message: "No shell command detected.",
		};
	}
	for (const pattern of destructiveCommandPatterns) {
		if (pattern.test(command)) {
			return {
				decision: "deny",
				policy_id: policyId,
				message: `Command blocked by destructive-command guard: ${command}`,
			};
		}
	}
	return {
		decision: "allow",
		policy_id: policyId,
		message: "Command allowed.",
	};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
