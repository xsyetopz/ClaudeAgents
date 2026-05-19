export function activate(pi) {
	pi.registerCommand("review", () => "alpha");
	pi.registerTool("bash", () => "override");
	pi.on("tool_call", () => undefined);
}
