import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
	server.registerTool(
		"escalate",
		{
			description:
				"Stop and present a decision to the user instead of choosing autonomously. Call this whenever you face a non-trivial choice.",
			inputSchema: {
				decision: z.string().describe("What needs to be decided (one line)"),
				context: z.string().describe("Why this came up (2-3 sentences)"),
				options: z
					.array(
						z.object({
							label: z.string().describe("Option identifier like A, B, C"),
							description: z.string().describe("What this option does"),
							tradeoff: z.string().describe("One-line tradeoff"),
						}),
					)
					.min(2)
					.describe("The available options"),
				recommendation: z
					.string()
					.describe("Which option you recommend and why"),
			},
		},
		async ({ decision, context, options, recommendation }) => {
			const optionLines = options
				.map((o) => `  [${o.label}] ${o.description} — ${o.tradeoff}`)
				.join("\n");

			const text = [
				`DECISION NEEDED: ${decision}`,
				"",
				`Context: ${context}`,
				"",
				"Options:",
				optionLines,
				"",
				`Recommendation: ${recommendation}`,
				"",
				"Waiting for user response. Do NOT proceed until the user chooses.",
			].join("\n");

			return { content: [{ type: "text", text }] };
		},
	);
}
