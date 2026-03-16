import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CWD } from "@/constants.js";

export function register(server: McpServer): void {
	server.registerTool(
		"validate_scope",
		{
			description:
				"Check if a file path is within the current task scope. Call before modifying files not explicitly mentioned in the plan.",
			inputSchema: {
				file_path: z.string().describe("The file path to validate"),
				action: z
					.enum(["read", "write", "delete"])
					.describe("What you intend to do"),
				justification: z.string().describe("Why you need to access this file"),
			},
		},
		async ({ file_path, action, justification }) => {
			const planPaths = [
				join(CWD, ".claude", "current-plan.md"),
				join(CWD, ".claude", "session-handoff.md"),
			];

			let planContent = "";
			for (const p of planPaths) {
				try {
					if (existsSync(p)) {
						planContent += readFileSync(p, "utf-8");
					}
				} catch {
					/* ignore */
				}
			}

			const fileInPlan =
				planContent.includes(file_path) ||
				planContent.includes(file_path.split("/").pop() ?? "");

			if (fileInPlan) {
				return {
					content: [
						{
							type: "text",
							text: `ALLOWED: ${file_path} is referenced in the current plan. Proceed with ${action}.`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text",
						text: `NEEDS APPROVAL: ${file_path} is NOT in the current plan.\nAction: ${action}\nJustification: ${justification}\n\nAsk the user before proceeding.`,
					},
				],
			};
		},
	);
}
