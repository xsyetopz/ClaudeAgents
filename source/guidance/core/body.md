# OpenAgentLayer Core Guidance

## Authority

OpenAgentLayer source records are the source of truth. Generated Codex, Claude, and OpenCode files are outputs and must not become hand-edited authority.

## Reboot contract

OAL v4 is a reboot. Do not add compatibility shims, legacy aliases, migration behavior, or v3 behavior preservation unless an explicit current source record requires it.

## Provider-native contract

Render each surface in that provider's native format. Do not invent provider keys, fake schema URLs, unsupported aliases, or harness-only behavior. If a provider cannot represent OAL metadata natively, keep the metadata in OAL prompt blocks, validation metadata, or runtime policy files.

## Source and upstream contract

Keep imported upstream skills sourced from `third_party/` submodules. OAL overlays may add routing, attribution, and tool policy, but must not rewrite upstream skill bodies by hand.

## Runtime contract

When behavior can be checked deterministically, prefer runtime guards, source validation, render tests, install manifests, or doctor checks over prose-only instructions.

## Worktree contract

Preserve unrelated dirty-tree work. Before broad changes, inspect current status and stage only the requested scope. Report validation commands exactly when edits or execution occur.
