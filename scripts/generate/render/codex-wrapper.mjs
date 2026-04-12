function q(value) {
	return JSON.stringify(value);
}

export function renderCodexWrapper(commandName, modes) {
	const cases = modes
		.map((mode) => {
			if (mode.nativeResume === true) {
				return `    ${mode.mode})
        PROFILE=${q(mode.profile)}
        exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/run-codex-filtered.mjs" resume --profile "$PROFILE" "$@"
        ;;`;
			}
			const configOverrides = (mode.configOverrides ?? [])
				.map((entry) => `        CODEX_CONFIG_ARGS+=(-c ${q(entry)})`)
				.join("\n");
			const contractLines = [
				`OPENAGENTSBTW_ROUTE=${mode.mode}`,
				`OPENAGENTSBTW_CONTRACT=${mode.routeKind ?? "readonly"}`,
				`OPENAGENTSBTW_ALLOW_BLOCKED=${mode.allowBlocked !== false ? "true" : "false"}`,
				`OPENAGENTSBTW_ALLOW_DOCS_ONLY=${mode.allowDocsOnly !== false ? "true" : "false"}`,
				`OPENAGENTSBTW_ALLOW_TESTS_ONLY=${mode.allowTestsOnly !== false ? "true" : "false"}`,
				`OPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=${mode.rejectPrototypeScaffolding === true ? "true" : "false"}`,
			]
				.map((line) => `        CONTRACT_LINES+=(${q(line)})`)
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
${contractLines}
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

if [[ "$MODE" == "resume" ]]; then
    case "$MODE" in
${cases}
        *)
            usage
            ;;
    esac
fi

if [[ "$MODE" != "resume" && $# -gt 0 ]]; then
    PROMPT="$*"
elif [[ "$MODE" != "resume" && ! -t 0 ]]; then
    PROMPT="$(cat)"
elif [[ "$MODE" != "resume" ]]; then
    usage
fi

PROFILE="openagentsbtw"
SYSTEM_PROMPT=""
CODEX_CONFIG_ARGS=()
CONTRACT_LINES=()

case "$MODE" in
${cases}
    *)
        usage
        ;;
esac

PROMPT_HEADER=""
if [[ \${#CONTRACT_LINES[@]} -gt 0 ]]; then
    PROMPT_HEADER="$(printf '%s\n' "\${CONTRACT_LINES[@]}")"
fi

FULL_PROMPT="$SYSTEM_PROMPT"
if [[ -n "$PROMPT_HEADER" ]]; then
    FULL_PROMPT="$FULL_PROMPT

$PROMPT_HEADER"
fi
FULL_PROMPT="$FULL_PROMPT

Task:
$PROMPT"

if [[ \${#CODEX_CONFIG_ARGS[@]} -gt 0 ]]; then
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/run-codex-filtered.mjs" exec --profile "$PROFILE" "\${CODEX_CONFIG_ARGS[@]}" "$FULL_PROMPT"
fi

exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/run-codex-filtered.mjs" exec --profile "$PROFILE" "$FULL_PROMPT"
`;
}
