import type { OalSource } from "@openagentlayer/source";
import type { PolicyIssue } from "./types";

const ROUTE_EVIDENCE_PATTERN = /validation|evidence|command|output/i;

export function validateContracts(
	source: OalSource,
	issues: PolicyIssue[],
): void {
	for (const route of source.routes) {
		if (route.permissions.includes("read-only")) {
			const agent = source.agents.find(
				(candidate) => candidate.id === route.agent,
			);
			if (
				agent?.tools.some(
					(tool) => tool === "write" || tool === "patch" || tool === "edit",
				)
			)
				issues.push({
					severity: "error",
					code: "readonly-write-tools",
					message: `Readonly route ${route.id} is owned by write-capable agent ${route.agent}.`,
					sourceId: route.id,
				});
		}
		if (!ROUTE_EVIDENCE_PATTERN.test(route.body))
			issues.push({
				severity: "error",
				code: "route-evidence-contract",
				message: `Route ${route.id} lacks validation/evidence contract.`,
				sourceId: route.id,
			});
	}
	for (const hook of source.hooks)
		if (!hook.script.endsWith(".mjs"))
			issues.push({
				severity: "error",
				code: "hook-script-extension",
				message: `Hook ${hook.id} must reference executable .mjs runtime script.`,
				sourceId: hook.id,
			});
}
