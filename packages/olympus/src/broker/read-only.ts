import { readFile } from "node:fs/promises";

export type BrokerKind = "git" | "gh" | "registry";

export interface BrokerRequest {
	schemaVersion: 1;
	kind: BrokerKind;
	operation: string;
	args?: Record<string, unknown>;
}

export interface BrokerValidationReport {
	schemaVersion: 1;
	command: "broker validate";
	valid: boolean;
	kind: BrokerKind | "unknown";
	operation: string | null;
	readOnly: boolean;
	reasons: string[];
}

const ALLOWED_OPERATIONS: Record<BrokerKind, Set<string>> = {
	git: new Set(["status", "diff", "log", "show", "ls-files"]),
	gh: new Set(["issue-view", "pr-view", "pr-checks", "repo-view"]),
	registry: new Set(["metadata", "tarball-info"]),
};

const FORBIDDEN_ARG_KEYS = new Set([
	"shell",
	"command",
	"exec",
	"script",
	"write",
	"token",
]);

export async function validateBrokerFixture(
	fixturePath: string,
): Promise<BrokerValidationReport> {
	const parsed = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
	return validateBrokerRequest(parsed);
}

export function validateBrokerRequest(value: unknown): BrokerValidationReport {
	const reasons: string[] = [];
	if (typeof value !== "object" || value === null) {
		return invalid("unknown", null, ["broker request must be an object"]);
	}
	const request = value as Partial<BrokerRequest>;
	const kind = isBrokerKind(request.kind) ? request.kind : "unknown";
	const operation =
		typeof request.operation === "string" ? request.operation : null;
	if (request.schemaVersion !== 1) reasons.push("schemaVersion must be 1");
	if (kind === "unknown")
		reasons.push("broker kind must be git, gh, or registry");
	if (operation === null) reasons.push("operation must be a string");
	if (
		operation !== null &&
		kind !== "unknown" &&
		!ALLOWED_OPERATIONS[kind].has(operation)
	) {
		reasons.push(
			`operation not approved for read-only ${kind} broker: ${operation}`,
		);
	}
	const args = request.args;
	if (typeof args === "object" && args !== null) {
		for (const key of Object.keys(args)) {
			if (FORBIDDEN_ARG_KEYS.has(key))
				reasons.push(`arbitrary shell/credential argument denied: ${key}`);
		}
	}
	return {
		schemaVersion: 1,
		command: "broker validate",
		valid: reasons.length === 0,
		kind,
		operation,
		readOnly: reasons.length === 0,
		reasons,
	};
}

function invalid(
	kind: BrokerValidationReport["kind"],
	operation: string | null,
	reasons: string[],
): BrokerValidationReport {
	return {
		schemaVersion: 1,
		command: "broker validate",
		valid: false,
		kind,
		operation,
		readOnly: false,
		reasons,
	};
}

function isBrokerKind(value: unknown): value is BrokerKind {
	return value === "git" || value === "gh" || value === "registry";
}
