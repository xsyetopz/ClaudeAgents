import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendAuditEvent } from "lifecycle";
import { deterministicDigest, sortStrings } from "reporting";
import { decidePolicy } from "safety";
import {
	buildMutationQueuePlan,
	type MutationQueuePlan,
} from "./mutation-queue.js";

const PATH_SEGMENT_PATTERN = /[\\/]+/;

export interface HephaestusApplyProof {
	schemaVersion: 1;
	command: "module hephaestus proof";
	planFile: string;
	planDigest: string;
	decision: "proven" | "blocked";
	applyEnabled: boolean;
	gates: {
		approvedDigestMatchesPlan: boolean;
		writePathsAllowed: boolean;
		writePathsManifestOwned: boolean;
		writePathsProjectRelative: boolean;
		themisApproved: boolean;
	};
	writes: string[];
	reasons: string[];
	digest: string;
}

export interface HephaestusApplyReport {
	schemaVersion: 1;
	command: "module hephaestus apply";
	planFile: string;
	apply: boolean;
	blocked: boolean;
	proof: HephaestusApplyProof;
	queue: MutationQueuePlan;
	wouldWrite: string[];
	written: string[];
	reason: string;
	warnings: string[];
	digest: string;
}

interface WriteOperation {
	kind: "write";
	path: string;
	content: string;
}

export async function proveHephaestusApplyGate(
	planFile: string,
): Promise<HephaestusApplyProof> {
	const absolutePlanFile = path.resolve(planFile);
	const parsed = parsePlan(await readFile(absolutePlanFile, "utf8"));
	const writes = strings(parsed["writes"] ?? parsed["writePaths"]);
	const allowedPaths = strings(parsed["allowedPaths"]);
	const manifestOwnedPaths = strings(parsed["manifestOwnedPaths"]);
	const planDigest = hephaestusPlanDigest(parsed);
	const approvedDigest = stringValue(parsed["approvedDigest"]);
	const gates = {
		approvedDigestMatchesPlan: approvedDigest === planDigest,
		writePathsAllowed: writes.every((writePath) =>
			allowedPaths.includes(writePath),
		),
		writePathsManifestOwned: writes.every((writePath) =>
			manifestOwnedPaths.includes(writePath),
		),
		writePathsProjectRelative: writes.every(isProjectRelativePath),
		themisApproved:
			parsed["themisApproved"] === true || parsed["themisDecision"] === "allow",
	};
	const reasons = reasonsForGates(gates);
	for (const writePath of writes) {
		const decision = decidePolicy({
			schemaVersion: 1,
			eventType: "tool_call",
			toolName: "write",
			operation: "write",
			path: writePath,
			generatedArtifact: true,
			manifestOwned: manifestOwnedPaths.includes(writePath),
		});
		if (decision.blocked) {
			reasons.push(
				`Themis blocks ${writePath}: ${decision.reasons.join("; ")}`,
			);
		}
	}
	const sortedReasons = sortStrings(reasons);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "module hephaestus proof" as const,
		planFile: absolutePlanFile,
		planDigest,
		decision:
			sortedReasons.length === 0 ? ("proven" as const) : ("blocked" as const),
		applyEnabled: sortedReasons.length === 0,
		gates,
		writes,
		reasons: sortedReasons,
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

export async function applyHephaestusPlan(
	planFile: string,
	options: { apply: boolean; projectRoot?: string } = { apply: false },
): Promise<HephaestusApplyReport> {
	const absolutePlanFile = path.resolve(planFile);
	const parsed = parsePlan(await readFile(absolutePlanFile, "utf8"));
	const operations = writeOperations(parsed);
	const proof = await proveHephaestusApplyGate(absolutePlanFile);
	const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
	const queue = buildMutationQueuePlan(
		operations.map((operation) => operation.path),
		projectRoot,
	);
	const operationReasons = operationBlockReasons(parsed, operations);
	const blocked =
		proof.decision !== "proven" ||
		operationReasons.length > 0 ||
		!queue.parallelSafe;
	const warnings = sortStrings([
		...proof.reasons,
		...operationReasons,
		...(queue.parallelSafe ? [] : queue.reasons),
	]);
	if (!options.apply || blocked) {
		const withoutDigest = {
			schemaVersion: 1 as const,
			command: "module hephaestus apply" as const,
			planFile: absolutePlanFile,
			apply: options.apply,
			blocked,
			proof,
			queue,
			wouldWrite: operations.map((operation) => operation.path).sort(),
			written: [] as string[],
			reason: blocked
				? "Hephaestus apply blocked by proof, operation, or queue gate"
				: "dry-run Hephaestus apply plan; rerun with --apply to write approved paths",
			warnings,
		};
		return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
	}
	const written: string[] = [];
	for (const operation of operations) {
		const target = path.resolve(projectRoot, operation.path);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, operation.content);
		written.push(operation.path);
	}
	await appendAuditEvent(projectRoot, {
		event: "hephaestus-apply",
		ok: true,
		detail: `applied approved Hephaestus plan ${proof.planDigest}`,
	});
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "module hephaestus apply" as const,
		planFile: absolutePlanFile,
		apply: true,
		blocked: false,
		proof,
		queue,
		wouldWrite: [] as string[],
		written: written.sort(),
		reason: "applied approved Hephaestus write plan",
		warnings: [] as string[],
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

export function hephaestusPlanDigest(plan: Record<string, unknown>): string {
	return deterministicDigest({
		purpose: "olympus-hephaestus-apply-plan-v1",
		writes: strings(plan["writes"] ?? plan["writePaths"]),
		allowedPaths: strings(plan["allowedPaths"]),
		manifestOwnedPaths: strings(plan["manifestOwnedPaths"]),
		operations: Array.isArray(plan["operations"]) ? plan["operations"] : [],
	});
}

function parsePlan(text: string): Record<string, unknown> {
	const parsed = JSON.parse(text) as unknown;
	if (typeof parsed !== "object" || parsed === null) {
		throw new Error("Hephaestus plan must be a JSON object");
	}
	return parsed as Record<string, unknown>;
}

function writeOperations(plan: Record<string, unknown>): WriteOperation[] {
	const operations = Array.isArray(plan["operations"])
		? plan["operations"]
		: [];
	return operations.flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const record = entry as Record<string, unknown>;
		const kind = record["kind"] ?? record["op"];
		if (kind !== "write") return [];
		const operationPath = record["path"];
		const content = record["content"];
		if (typeof operationPath !== "string" || typeof content !== "string") {
			return [];
		}
		return [{ kind: "write" as const, path: operationPath, content }];
	});
}

function operationBlockReasons(
	plan: Record<string, unknown>,
	operations: WriteOperation[],
): string[] {
	const writes = strings(plan["writes"] ?? plan["writePaths"]);
	const operationPaths = operations.map((operation) => operation.path).sort();
	const reasons: string[] = [];
	if (operations.length === 0) reasons.push("no write operations supplied");
	for (const writePath of writes) {
		if (!operationPaths.includes(writePath)) {
			reasons.push(`missing write operation for ${writePath}`);
		}
	}
	for (const operationPath of operationPaths) {
		if (!writes.includes(operationPath)) {
			reasons.push(`operation path not listed in writes: ${operationPath}`);
		}
	}
	return reasons;
}

function strings(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((entry): entry is string => typeof entry === "string").sort()
		: [];
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function isProjectRelativePath(value: string): boolean {
	return (
		value.length > 0 &&
		!value.startsWith("~") &&
		!path.isAbsolute(value) &&
		!value.split(PATH_SEGMENT_PATTERN).includes("..")
	);
}

function reasonsForGates(gates: HephaestusApplyProof["gates"]): string[] {
	const reasons: string[] = [];
	if (!gates.approvedDigestMatchesPlan) {
		reasons.push("approved digest does not match canonical plan digest");
	}
	if (!gates.writePathsAllowed)
		reasons.push("write path missing from allowlist");
	if (!gates.writePathsManifestOwned) {
		reasons.push("write path missing from manifest-owned path list");
	}
	if (!gates.writePathsProjectRelative) {
		reasons.push(
			"write path must be project-relative and must not escape root",
		);
	}
	if (!gates.themisApproved) reasons.push("Themis approval is missing");
	return reasons;
}
