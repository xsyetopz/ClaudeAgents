import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CHECKPOINTS_PATH } from "@/constants.js";

export function register(server: McpServer): void {
	server.registerTool(
		"checkpoint",
		{
			description:
				"Save or load session state for continuity across /clear boundaries.",
			inputSchema: {
				action: z
					.enum(["save", "load", "list"])
					.describe("Save, load, or list checkpoints"),
				key: z
					.string()
					.optional()
					.describe("Checkpoint name (required for save/load)"),
				data: z
					.string()
					.optional()
					.describe("Data to save (JSON string, required for save)"),
			},
		},
		async ({ action, key, data }) => {
			let store: Record<string, unknown> = {};
			try {
				if (existsSync(CHECKPOINTS_PATH)) {
					store = JSON.parse(readFileSync(CHECKPOINTS_PATH, "utf-8"));
				}
			} catch {
				/* fresh store */
			}

			if (action === "list") {
				const keys = Object.keys(store);
				return {
					content: [
						{
							type: "text",
							text:
								keys.length > 0
									? `Checkpoints: ${keys.join(", ")}`
									: "No checkpoints saved.",
						},
					],
				};
			}

			if (!key) {
				return {
					content: [
						{
							type: "text",
							text: "Error: key is required for save/load.",
						},
					],
				};
			}

			if (action === "save") {
				if (!data) {
					return {
						content: [
							{
								type: "text",
								text: "Error: data is required for save.",
							},
						],
					};
				}
				let parsedData: unknown;
				try {
					parsedData = JSON.parse(data);
				} catch {
					parsedData = data;
				}
				let author = "unknown";
				try {
					author = execSync("git config user.name", {
						encoding: "utf-8",
					}).trim();
				} catch {
					/* ignore */
				}
				store[key] = {
					data: parsedData,
					author,
					timestamp: new Date().toISOString(),
				};
				writeFileSync(CHECKPOINTS_PATH, JSON.stringify(store, null, 2));
				return {
					content: [{ type: "text", text: `Checkpoint '${key}' saved.` }],
				};
			}

			if (!(key in store)) {
				return {
					content: [{ type: "text", text: `Checkpoint '${key}' not found.` }],
				};
			}
			return {
				content: [
					{
						type: "text",
						text: `Checkpoint '${key}':\n${JSON.stringify(
							store[key],
							null,
							2,
						)}`,
					},
				],
			};
		},
	);
}
