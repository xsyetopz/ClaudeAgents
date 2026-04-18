export const AGENTIC_FULL_SCOPES = ["project", "global"];

export const AGENTIC_FULL_SETTINGS = [
	{
		tool: "cursor",
		templatePath: ["cursor", ".cursor", "mcp.json"],
		serverKey: "mcpServers",
		projectTarget: [".cursor", "mcp.json"],
	},
	{
		tool: "gemini-cli",
		templatePath: ["gemini-cli", ".gemini", "settings.json"],
		serverKey: "mcpServers",
		projectTarget: [".gemini", "settings.json"],
		globalHome: "geminiHome",
		globalTarget: ["settings.json"],
	},
	{
		tool: "kiro",
		templatePath: ["kiro", ".kiro", "settings", "mcp.json"],
		serverKey: "mcpServers",
		projectTarget: [".kiro", "settings", "mcp.json"],
		globalHome: "kiroHome",
		globalTarget: ["settings", "mcp.json"],
	},
	{
		tool: "augment",
		templatePath: ["augment", "settings.json"],
		serverKey: "mcpServers",
		projectTarget: [".augment", "settings.json"],
		globalHome: "augmentHome",
		globalTarget: ["settings.json"],
	},
	{
		tool: "amp",
		templatePath: ["amp", "settings.json"],
		serverKey: "amp.mcpServers",
		projectTarget: [".amp", "settings.json"],
		globalHome: "ampConfigDir",
		globalTarget: ["settings.json"],
	},
];

export const AGENTIC_FULL_TREES = [
	{
		tool: "cline",
		templatePath: ["cline", "workflows"],
		projectTarget: [".clinerules", "workflows"],
		globalHome: "clineHome",
		globalTarget: ["Workflows"],
	},
	{
		tool: "cline",
		templatePath: ["cline", "hooks"],
		projectTarget: [".clinerules", "hooks"],
		globalHome: "clineHome",
		globalTarget: ["Hooks"],
	},
	{
		tool: "amp",
		templatePath: ["amp", "skills"],
		projectTarget: [".agents", "skills"],
		globalHome: "ampConfigDir",
		globalTarget: ["skills"],
	},
	{
		tool: "amp",
		templatePath: ["amp", "checks"],
		projectTarget: [".agents", "checks"],
		globalHome: "ampConfigDir",
		globalTarget: ["checks"],
	},
];

export const AGENTIC_FULL_HOOKS = [
	{
		tool: "kiro",
		templatePath: ["kiro", "hooks", "openagentsbtw.json"],
		projectTarget: [".kiro", "hooks", "openagentsbtw.json"],
		globalHome: "kiroHome",
		globalTarget: ["hooks", "openagentsbtw.json"],
	},
	{
		tool: "augment",
		templatePath: ["augment", "hooks", "openagentsbtw.json"],
		projectTarget: [".augment", "hooks", "openagentsbtw.json"],
		globalHome: "augmentHome",
		globalTarget: ["hooks", "openagentsbtw.json"],
	},
];

export const AGENTIC_FULL_MARKDOWN = [
	{
		tool: "air",
		templatePath: ["air", "review-prompt.md"],
		projectTarget: ["review-prompt.md"],
		markerName: "agentic-ides air-review",
	},
];

export const AGENTIC_FULL_WARN_ONLY_TOOLS = new Set(["antigravity"]);

export function relativeTemplatePath(...segments) {
	return segments.flat().join("/");
}
