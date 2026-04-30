#!/usr/bin/env bun
const policyId = "completion-gate";

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) {
		text += chunk;
	}
	return text.trim() === "" ? {} : JSON.parse(text);
}

function extractMetadata(payload) {
	if (
		payload &&
		typeof payload.metadata === "object" &&
		payload.metadata !== null
	) {
		return payload.metadata;
	}
	const input = payload?.tool_input;
	if (
		input &&
		typeof input === "object" &&
		typeof input.metadata === "object" &&
		input.metadata !== null
	) {
		return input.metadata;
	}
	return {};
}

function evaluate(payload) {
	const metadata = extractMetadata(payload);
	const ok =
		metadata.validation_passed === true ||
		metadata.validation === "passed" ||
		metadata.validation === "pass";
	return ok
		? {
				decision: "allow",
				policy_id: policyId,
				message: "Completion gate satisfied.",
			}
		: {
				decision: "deny",
				policy_id: policyId,
				message: "Completion blocked: missing validation evidence.",
			};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
