import path from "node:path";
import { deterministicDigest } from "reporting";

export interface MutationQueuePlan {
	schemaVersion: 1;
	command: "lock queue";
	projectRoot: string;
	paths: string[];
	queues: Array<{ queueKey: string; paths: string[] }>;
	parallelSafe: boolean;
	reasons: string[];
	digest: string;
}

export function buildMutationQueuePlan(
	paths: string[],
	projectRoot: string = process.cwd(),
): MutationQueuePlan {
	const root = path.resolve(projectRoot);
	const normalized = paths
		.map((entry) => normalizePath(entry, root))
		.sort((left, right) => left.localeCompare(right));
	const groups = new Map<string, string[]>();
	for (const filePath of normalized) {
		const queueKey = queueKeyFor(filePath);
		groups.set(queueKey, [...(groups.get(queueKey) ?? []), filePath]);
	}
	const queues = [...groups.entries()]
		.map(([queueKey, groupedPaths]) => ({ queueKey, paths: groupedPaths }))
		.sort((left, right) => left.queueKey.localeCompare(right.queueKey));
	const parallelSafe = queues.every((queue) => queue.paths.length === 1);
	const withoutDigest = {
		schemaVersion: 1 as const,
		command: "lock queue" as const,
		projectRoot: root,
		paths: normalized,
		queues,
		parallelSafe,
		reasons: parallelSafe
			? ["all paths map to distinct queue keys"]
			: ["one or more paths share a queue key and must be serialized"],
	};
	return { ...withoutDigest, digest: deterministicDigest(withoutDigest) };
}

function normalizePath(input: string, projectRoot: string): string {
	const absolute = path.isAbsolute(input)
		? path.normalize(input)
		: path.resolve(projectRoot, input);
	const relative = path.relative(projectRoot, absolute);
	return relative.startsWith("..")
		? absolute
		: relative.split(path.sep).join("/");
}

function queueKeyFor(filePath: string): string {
	if (filePath === ".pi/settings.json") return ".pi/settings.json";
	if (filePath.startsWith(".pi/olympus/olympus-manifest.json"))
		return ".pi/olympus/olympus-manifest.json";
	if (filePath.startsWith(".pi/olympus/olympus.lock"))
		return ".pi/olympus/olympus.lock";
	if (filePath.startsWith(".pi/olympus/audit.jsonl"))
		return ".pi/olympus/audit.jsonl";
	return filePath;
}
