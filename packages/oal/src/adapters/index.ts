import { claudeAdapter } from "./claude";
import { codexAdapter } from "./codex";
import { opencodeAdapter } from "./opencode";
import type { PlatformAdapter } from "./types";

export const adapters: PlatformAdapter[] = [
	codexAdapter,
	claudeAdapter,
	opencodeAdapter,
];

export function adapterFor(platform: string): PlatformAdapter | undefined {
	return adapters.find((adapter) => adapter.id === platform);
}
