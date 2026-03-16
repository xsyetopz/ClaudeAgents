import { appendFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AUDIT_LOG_PATH } from "@/constants.js";

export function register(server: McpServer): void {
	server.registerTool(
		"audit_log",
		{
			description:
				"Record a decision or action for enterprise compliance. Call before file modifications in enterprise persona.",
			inputSchema: {
				agent: z.string().describe("Agent name (e.g., hephaestus, nemesis)"),
				action: z.string().describe("What action is being taken"),
				rationale: z.string().describe("Why this action was chosen"),
				files: z.array(z.string()).optional().describe("File paths affected"),
			},
		},
		async ({ agent, action, rationale, files }) => {
			const entry = {
				ts: new Date().toISOString(),
				agent,
				action,
				rationale,
				files: files ?? [],
			};
			try {
				appendFileSync(AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`);
			} catch {
				// .claude dir may not exist; fail gracefully
			}
			return {
				content: [{ type: "text", text: `Logged: [${agent}] ${action}` }],
			};
		},
	);
}
