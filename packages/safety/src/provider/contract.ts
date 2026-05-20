import { readFile } from "node:fs/promises";
import type { PolicyEvent } from "../policy/types.js";

export type ProviderCapability =
	| "tool-events"
	| "approval-events"
	| "blocker-events"
	| "context-packets";
export type ProviderEventKind =
	| "tool-call"
	| "tool-result"
	| "approval-required"
	| "blocker";

export interface ProviderAdapterContract {
	schemaVersion: 1;
	adapterId: string;
	mode: "fixture-stub" | "real-runtime";
	capabilities: ProviderCapability[];
	launchesProvider: boolean;
	fixtureOnly: boolean;
}

export interface ProviderEventFixture {
	schemaVersion: 1;
	adapterId: string;
	eventId: string;
	kind: ProviderEventKind;
	payload: Record<string, unknown>;
}

export interface ProviderFixtureValidationReport {
	schemaVersion: 1;
	command: "provider fixture validate";
	valid: boolean;
	adapter: ProviderAdapterContract;
	event: ProviderEventFixture | null;
	policyEvent: PolicyEvent | null;
	reasons: string[];
}

export const FIRST_PARTY_STUB_PROVIDER: ProviderAdapterContract = {
	schemaVersion: 1,
	adapterId: "olympi-fixture-stub",
	mode: "fixture-stub",
	capabilities: [
		"tool-events",
		"approval-events",
		"blocker-events",
		"context-packets",
	],
	launchesProvider: false,
	fixtureOnly: true,
};

export async function validateProviderFixture(
	fixturePath: string,
): Promise<ProviderFixtureValidationReport> {
	return validateProviderEvent(
		JSON.parse(await readFile(fixturePath, "utf8")) as unknown,
	);
}

export function validateProviderEvent(
	value: unknown,
): ProviderFixtureValidationReport {
	const reasons: string[] = [];
	if (typeof value !== "object" || value === null) {
		return report(null, null, ["provider event must be an object"]);
	}
	const event = value as Partial<ProviderEventFixture>;
	if (event.schemaVersion !== 1) reasons.push("schemaVersion must be 1");
	if (event.adapterId !== FIRST_PARTY_STUB_PROVIDER.adapterId)
		reasons.push("only first-party fixture stub adapter is supported");
	if (typeof event.eventId !== "string" || event.eventId.length === 0)
		reasons.push("eventId must be a non-empty string");
	if (!isProviderEventKind(event.kind))
		reasons.push(
			"kind must be tool-call, tool-result, approval-required, or blocker",
		);
	if (typeof event.payload !== "object" || event.payload === null)
		reasons.push("payload must be an object");
	const fixture = reasons.length === 0 ? (event as ProviderEventFixture) : null;
	return report(
		fixture,
		fixture === null ? null : providerEventToPolicyEvent(fixture),
		reasons,
	);
}

export function providerEventToPolicyEvent(
	event: ProviderEventFixture,
): PolicyEvent {
	if (event.kind === "tool-call") {
		const command = event.payload["command"];
		return {
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: String(event.payload["toolName"] ?? "provider-tool"),
			...(typeof command === "string" ? { command } : {}),
			paths: Array.isArray(event.payload["paths"])
				? event.payload["paths"].map(String)
				: [],
			providerMetadata: {
				source: "provider-event",
				missingFields: [],
				eventShape: Object.keys(event.payload).sort(),
				preventedOperation: "provider fixture tool-call",
			},
		};
	}
	if (event.kind === "tool-result")
		return {
			schemaVersion: 1,
			eventType: "tool_result",
			text: JSON.stringify(event.payload),
		};
	return {
		schemaVersion: 1,
		eventType: "before_provider_request",
		text: `${event.kind}: ${event.eventId}`,
	};
}

function report(
	event: ProviderEventFixture | null,
	policyEvent: PolicyEvent | null,
	reasons: string[],
): ProviderFixtureValidationReport {
	return {
		schemaVersion: 1,
		command: "provider fixture validate",
		valid: reasons.length === 0,
		adapter: FIRST_PARTY_STUB_PROVIDER,
		event,
		policyEvent,
		reasons,
	};
}

function isProviderEventKind(value: unknown): value is ProviderEventKind {
	return (
		value === "tool-call" ||
		value === "tool-result" ||
		value === "approval-required" ||
		value === "blocker"
	);
}
