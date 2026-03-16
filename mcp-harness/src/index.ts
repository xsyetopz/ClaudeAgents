import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as auditLog from "@/tools/audit-log.js";
import * as checkpoint from "@/tools/checkpoint.js";
import * as contextHealth from "@/tools/context-health.js";
import * as escalate from "@/tools/escalate.js";
import * as validateScope from "@/tools/validate-scope.js";

const server = new McpServer({
	name: "cca-harness",
	version: "0.1.0",
});

escalate.register(server);
auditLog.register(server);
contextHealth.register(server);
validateScope.register(server);
checkpoint.register(server);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("cca-harness MCP server running on stdio");
}

main().catch((e) => {
	console.error("Fatal:", e);
	process.exit(1);
});
