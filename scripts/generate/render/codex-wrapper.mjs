function q(value) {
	return JSON.stringify(value);
}

export function renderCodexWrapper(commandName, modes) {
	const cases = modes
		.map((mode) => {
			const configOverrides = (mode.configOverrides ?? [])
				.map((entry) => `        CODEX_CONFIG_ARGS+=(-c ${q(entry)})`)
				.join("\n");
			const deepwikiGuard = mode.requiresDeepwiki
				? `        if ! grep -Eq '^[[:space:]]*\\[mcp_servers\\.deepwiki\\]' "$HOME/.codex/config.toml" 2>/dev/null; then
            echo "DeepWiki is not configured. Reinstall with --deepwiki-mcp or use triage." >&2
            exit 1
        fi
        if [[ ! -d .git ]] || ! git remote get-url origin 2>/dev/null | grep -Eq '^https://github\\.com/|^git@github\\.com:'; then
            echo "DeepWiki mode expects a GitHub repository. Use triage for local-only or non-GitHub repos." >&2
            exit 1
        fi
`
				: "";
			return `    ${mode.mode})
        PROFILE=${q(mode.profile)}
        SYSTEM_PROMPT=${q(mode.prompt)}
${configOverrides ? `${configOverrides}\n` : ""}${deepwikiGuard}        ;;`;
		})
		.join("\n");
	const utilityModes =
		"  memory      Inspect or manage openagentsbtw Codex memory";
	const modeLines = [
		...modes.map(
			(mode) => `  ${mode.mode.padEnd(11)} Generated openagentsbtw Codex route`,
		),
		utilityModes,
	].join("\n");

	return `#!/bin/bash
set -euo pipefail

usage() {
    cat <<'EOF' >&2
Usage: ${commandName} <mode> [prompt...]

Modes:
${modeLines}

Memory commands:
  ${commandName} memory show [path]
  ${commandName} memory forget-project [path]
  ${commandName} memory prune
EOF
    exit 1
}

[[ $# -ge 1 ]] || usage

MODE="$1"
shift

if [[ "$MODE" == "memory" ]]; then
    [[ $# -ge 1 ]] || usage
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/memory-manage.mjs" "$@"
fi

if [[ $# -gt 0 ]]; then
    PROMPT="$*"
elif [[ ! -t 0 ]]; then
    PROMPT="$(cat)"
else
    usage
fi

PROFILE="openagentsbtw"
SYSTEM_PROMPT=""
CODEX_CONFIG_ARGS=()

case "$MODE" in
${cases}
    *)
        usage
        ;;
esac

exec codex exec --profile "$PROFILE" "\${CODEX_CONFIG_ARGS[@]}" "\${SYSTEM_PROMPT}

Task:
\${PROMPT}"
`;
}
