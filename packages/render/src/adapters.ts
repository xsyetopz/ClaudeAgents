import type { SurfaceAdapter } from "@openagentlayer/adapter-contract";
import { createClaudeAdapter } from "@openagentlayer/adapters/providers/claude";
import { createCodexAdapter } from "@openagentlayer/adapters/providers/codex";
import { createOpenCodeAdapter } from "@openagentlayer/adapters/providers/opencode";

export function createDefaultAdapters(): readonly SurfaceAdapter[] {
	return [createCodexAdapter(), createClaudeAdapter(), createOpenCodeAdapter()];
}

export function compareAdapters(
	left: SurfaceAdapter,
	right: SurfaceAdapter,
): number {
	return left.surface.localeCompare(right.surface);
}
