# Hook System

Hooks enforce outcomes that prompts cannot reliably enforce.

## Hook Classes

| Class        | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| pre-command  | block unsafe/noisy/destructive shell before execution                   |
| post-command | summarize output and capture artifacts                                  |
| pre-response | block false completion, missing validation, or empty/temporary language |
| stop         | scan final answer for contract violations                               |
| session      | inject tiny core context and refresh status                             |
| install      | verify managed files and manifests                                      |

## Capability Levels

- `native`: platform supports a deterministic hook/permission surface.
- `partial`: some hook-like enforcement exists.
- `prompt-only`: no deterministic hook; only rules/instructions can be rendered.
- `unsupported`: no safe mapping.

## Rules

- Use native hooks when available.
- Do not emulate deterministic enforcement with prose.
- Blocking messages must name exact command, file, or missing evidence.
- Hooks must be self-contained after install.
- Hooks cannot import repo source at runtime unless installed bundle includes it.
- Hook output must stay terse and actionable.

## v4 Stop Gates

- no "future work" when user requested implementation
- no docs-only completion for implementation task
- no unvalidated completion when validation gate exists
- no unsupported platform claim without evidence
- no raw broad command when harness verb exists
- no v3 public-surface resurrection
