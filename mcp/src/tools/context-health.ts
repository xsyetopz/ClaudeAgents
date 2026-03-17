import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function register(server: McpServer): void {
	server.registerTool(
		"context_health",
		{
			description:
				"Check context window health and get a recommendation. Call periodically in long sessions.",
			inputSchema: {
				estimated_tokens: z
					.number()
					.optional()
					.describe("Estimated tokens used so far (if known)"),
			},
		},
		async ({ estimated_tokens }) => {
			const tokens = estimated_tokens ?? 0;
			let zone: string;
			let recommendation: string;

			if (tokens === 0) {
				zone = "unknown";
				recommendation =
					"Pass estimated_tokens for accurate guidance. If the session feels slow or repetitive, start fresh with /clear.";
			} else if (tokens < 300_000) {
				zone = "green";
				recommendation = "Context is healthy. Continue working.";
			} else if (tokens < 600_000) {
				zone = "yellow";
				recommendation =
					"Soft degradation zone. Consider wrapping up the current task and starting a fresh session. Summarize progress before /clear.";
			} else {
				zone = "red";
				recommendation =
					"High risk of context degradation and compaction. Stop, export session state, and start fresh. Use /cca:session-export.";
			}

			return {
				content: [
					{
						type: "text",
						text: `Context zone: ${zone.toUpperCase()} (${
							tokens > 0 ? `~${tokens.toLocaleString()} tokens` : "unknown"
						})\n${recommendation}`,
					},
				],
			};
		},
	);
}
