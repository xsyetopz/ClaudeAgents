export function renderCodexPeerWrapper(commandName) {
	return `#!/bin/bash
set -euo pipefail

usage() {
    cat <<'EOF' >&2
Usage: ${commandName} <batch|tmux> [--dry-run] [task...]

Modes:
  batch       Run orchestrator, QA, worker, and review as top-level Codex exec jobs
  tmux        Create a tmux session with orchestrator, QA, worker, and review panes

Options:
  --dry-run   Print the generated peer-run plan without launching it
EOF
    exit 1
}

[[ $# -ge 1 ]] || usage

MODE="$1"
shift

case "$MODE" in
    batch|tmux) ;;
    *)
        usage
        ;;
esac

ARGS=()
if [[ $# -gt 0 && "$1" == "--dry-run" ]]; then
    ARGS+=("$1")
    shift
fi

if [[ $# -gt 0 ]]; then
    TASK="$*"
elif [[ ! -t 0 ]]; then
    TASK="$(cat)"
else
    usage
fi

exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/peer-run.mjs" "$MODE" "\${ARGS[@]}" "$TASK"
`;
}
