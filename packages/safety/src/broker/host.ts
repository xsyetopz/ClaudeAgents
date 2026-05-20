import { readFile } from "node:fs/promises";

export type ExecutableCapability = "filesystem" | "network" | "process";

export interface HostBrokerRequest {
	schemaVersion: 1;
	resourceId: string;
	mode: "dry-run" | "live";
	capabilities: ExecutableCapability[];
	filesystem?: { read?: string[]; write?: string[] };
	network?: { allow: boolean; hosts?: string[] };
	process?: { allow: boolean; commands?: string[] };
}

export interface HostBrokerDecision {
	schemaVersion: 1;
	command: "host-broker decide";
	allowed: boolean;
	liveExecution: false;
	resourceId: string;
	reasons: string[];
	granted: ExecutableCapability[];
}

export async function decideHostBrokerFixture(
	fixturePath: string,
): Promise<HostBrokerDecision> {
	return decideHostBrokerRequest(
		JSON.parse(await readFile(fixturePath, "utf8")) as unknown,
	);
}

export function decideHostBrokerRequest(value: unknown): HostBrokerDecision {
	const reasons: string[] = [];
	if (typeof value !== "object" || value === null)
		return denied("unknown", [
			"executable-resource gate request must be an object",
		]);
	const request = value as Partial<HostBrokerRequest>;
	const resourceId =
		typeof request.resourceId === "string" ? request.resourceId : "unknown";
	if (request.schemaVersion !== 1) reasons.push("schemaVersion must be 1");
	if (resourceId === "unknown" || resourceId.length === 0)
		reasons.push("resourceId must be a non-empty string");
	if (request.mode === "live")
		reasons.push(
			"live executable-resource host brokering is not a product surface",
		);
	if (request.mode !== "dry-run" && request.mode !== "live")
		reasons.push("mode must be dry-run or live");
	const capabilities = Array.isArray(request.capabilities)
		? request.capabilities
		: [];
	for (const capability of capabilities)
		if (!isCapability(capability))
			reasons.push(`unknown executable capability: ${String(capability)}`);
	if (request.network?.allow === true)
		reasons.push("network access denied for executable-resource gate");
	if (request.process?.allow === true)
		reasons.push("process execution denied for executable-resource gate");
	if ((request.filesystem?.write ?? []).length > 0)
		reasons.push("filesystem writes denied for executable-resource gate");
	return {
		schemaVersion: 1,
		command: "host-broker decide",
		allowed: reasons.length === 0,
		liveExecution: false,
		resourceId,
		reasons,
		granted: reasons.length === 0 ? capabilities.filter(isCapability) : [],
	};
}

function denied(resourceId: string, reasons: string[]): HostBrokerDecision {
	return {
		schemaVersion: 1,
		command: "host-broker decide",
		allowed: false,
		liveExecution: false,
		resourceId,
		reasons,
		granted: [],
	};
}

function isCapability(value: unknown): value is ExecutableCapability {
	switch (value) {
		case "filesystem":
		case "network":
		case "process":
			return true;
		default:
			return false;
	}
}
