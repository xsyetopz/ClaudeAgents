import type { OalSource } from "@openagentlayer/source";
import type { PolicyIssue } from "./types";

export function validateProductName(
	source: OalSource,
	issues: PolicyIssue[],
): void {
	if (
		source.product.name !== "OpenAgentLayer" ||
		source.product.shortName !== "OAL"
	)
		issues.push({
			severity: "error",
			code: "product-name",
			message: "Source product identity must be OpenAgentLayer/OAL.",
		});
}
