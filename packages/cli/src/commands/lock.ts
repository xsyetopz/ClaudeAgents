import { buildMutationQueuePlan } from "authoring";
import { type ExitCode, OlympiError } from "lifecycle";
import { asJson } from "reporting";

export function runLock(args: string[], json: boolean): ExitCode {
	if (args[0] !== "queue") {
		throw new OlympiError("usage: olympi lock queue <paths...> [--json]", 2);
	}
	const paths = args.slice(1).filter((arg) => !arg.startsWith("--"));
	if (paths.length === 0) {
		throw new OlympiError("usage: olympi lock queue <paths...> [--json]", 2);
	}
	const report = buildMutationQueuePlan(paths);
	process.stdout.write(json ? asJson(report) : formatQueue(report));
	return report.parallelSafe ? 0 : 1;
}

function formatQueue(
	report: ReturnType<typeof buildMutationQueuePlan>,
): string {
	const lines = [
		`Olympi lock queue: ${report.parallelSafe ? "parallel-safe" : "serialize"}`,
		`Queues: ${report.queues.length}`,
	];
	for (const queue of report.queues) {
		lines.push(`- ${queue.queueKey}: ${queue.paths.join(", ")}`);
	}
	for (const reason of report.reasons) lines.push(`reason: ${reason}`);
	return `${lines.join("\n")}\n`;
}
