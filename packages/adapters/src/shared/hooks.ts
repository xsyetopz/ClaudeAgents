import type { PolicyRecord, Surface } from "@openagentlayer/types";

const DEFAULT_EVENTS_BY_SURFACE: Record<string, Record<string, string>> = {
	claude: {
		completion: "Stop",
		compaction: "PreCompact",
		file_change: "PostToolUse",
		permission_request: "PermissionRequest",
		post_tool: "PostToolUse",
		pre_tool: "PreToolUse",
		prompt_submit: "UserPromptSubmit",
		session_status: "Stop",
	},
	codex: {
		completion: "Stop",
		compaction: "UserPromptSubmit",
		file_change: "PostToolUse",
		permission_request: "PermissionRequest",
		post_tool: "PostToolUse",
		pre_tool: "PreToolUse",
		prompt_submit: "UserPromptSubmit",
		session_status: "Stop",
	},
	opencode: {
		completion: "session.status",
		compaction: "tui.prompt.append",
		file_change: "tool.execute.after",
		permission_request: "permission.asked",
		post_tool: "tool.execute.after",
		pre_tool: "tool.execute.before",
		prompt_submit: "tui.prompt.append",
		session_status: "session.status",
	},
};

export function resolveHookEvent(
	record: PolicyRecord,
	surface: Surface,
): string {
	const mappedEvent = record.surface_mappings[surface];
	if (typeof mappedEvent === "string" && mappedEvent.length > 0) {
		return mappedEvent;
	}

	return (
		DEFAULT_EVENTS_BY_SURFACE[surface]?.[record.hook_event_category] ??
		DEFAULT_EVENTS_BY_SURFACE[surface]?.["session_status"] ??
		"Stop"
	);
}
