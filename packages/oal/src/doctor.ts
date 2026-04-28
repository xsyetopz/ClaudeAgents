import { adapterFor } from "./adapters";
import type { DoctorResult } from "./adapters/types";
import { createOalError, loadSource } from "./source";

export function doctorHooks(
	platform: string,
	root = process.cwd(),
): DoctorResult {
	const graph = loadSource(root);
	const adapter = adapterFor(platform);
	if (!adapter) {
		throw createOalError(
			"source/oal.json",
			"/platforms",
			"doctor hooks platform has no adapter",
			platform,
			"enabled platform with adapter",
		);
	}
	return adapter.doctorHooks(root, graph);
}

export function formatDoctorResult(result: DoctorResult): string {
	const lines = [
		`${result.ok ? "ok" : "fail"}: ${result.platform} hook doctor`,
		...result.checks.map(
			(check) =>
				`${check.ok ? "ok" : "fail"}: ${check.path ?? result.platform}: ${check.message}`,
		),
	];
	return lines.join("\n");
}
