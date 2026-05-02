export type Provider = "codex" | "claude" | "opencode";
export type ModelMap = Partial<Record<Provider, string>>;

export function supportedProviders(): Provider[] {
	return ["codex", "claude", "opencode"];
}
