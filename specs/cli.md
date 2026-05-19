# CLI Contract

The active low-level binary is `olympus`. The source-checkout invocation is `bun run olympus -- <command>`.

## Read-only commands

- `inspect <local-package-path> [--json]`
- `package evaluate <source> [--json]`
- `package-evaluate <source> [--json]`
- `evaluate <source> [--json]` / `eval <source> [--json]`
- `package inspect <source> [--json]`
- `package risk <source> [--json]` / `risk <source> [--json]`
- `catalog [--json]`
- `spec [--json]`
- `setup status [--json]`
- `status [--json]`
- `state [inspect|status] [--json]`
- `report status [--json]`
- `report status --write [--json]`
- `report handoff [--json]`
- `report handoff --write [--statusline <pi-statusline>] [--threshold-percent <n>] [--json]`
- `report acceptance [--json]`
- `report acceptance --write [--json]`
- `report package-risk <source> [--json]`
- `handoff current --write [--statusline <pi-statusline>] [--threshold-percent <n>] [--json]`
- `audit append <event> --detail <detail> --apply [--json]`
- `context statusline --statusline <pi-statusline> [--json]`
- `context compact-advice --statusline <pi-statusline> [--after-handoff] [--threshold-percent <n>] [--json]`
- `compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]`
- `rtk status [--json]`
- `rtk plan <command...> [--json]`
- `quota status [--json]`
- `lock queue <paths...> [--json]`
- `profile status [--json]`
- `profile set --name <name> [--apply] [--json]`
- `safety check [--json]`
- `hooks policy [--json]`
- `hooks aegis-runtime [--json]`
- `hooks aegis-install --project [--dry-run|--apply] [--json]`
- `sandbox check [--json]`
- `broker validate <fixture> [--json]`
- `trust status [--json]`
- `trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]`
- `trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]`
- `resources validate [path] [--json]`
- `resources install --project [--dry-run|--apply] [--json]`
- `prompt contract <input-or-file> [--json]`
- `review plan <plan-file> [--json]`
- `review diff <diff-file> [--json]`
- `handoff current [--json]`
- `module status [--json]`
- `module run <module> --dry-run [--json]`
- `module hephaestus proof <plan-file> [--json]`
- `module hephaestus apply <plan-file> [--apply] [--json]`
- `plan <operation> [source] [--json]`
- `verify [--json]`
- `check [--json]` / `accept [--json]`
- `extension inspect <path> [--json]`

## Mutating commands

- `extension create <name> --apply --output <directory> [--json]` writes only to the explicit output directory.
- `hooks aegis-install --project --apply [--json]` writes only `.pi/extensions/olympus-aegis.ts` in the current project.
- `resources install --project --apply [--json]` writes only project-local `.pi/settings.json` and `.pi/olympus/**` first-party resource, manifest, lock, and audit paths.
- `profile set --name <name> --apply [--json]` writes only `.pi/olympus/profile.json`.
- `install <source> --project --apply [--json]` writes only Olympus-owned project-local mirror, lock, manifest, audit, and settings package entries.
- `install <source> --project --executable --signature-digest <sha256> --apply [--json]` stages executable package mirror, manifest, and trusted-executable lock without enabling settings load.
- `trust executable-load --package-id <id> --apply [--json]` writes the project-local settings package entry only after manifest, lock, signature, and sandbox proof pass.
- `module hephaestus apply <plan-file> --apply [--json]` writes only operation paths from a proven plan and appends project-local audit.
- `uninstall <package-id> --project --apply [--json]` removes only manifest-owned resources with matching hashes.

Mutating commands support dry-run forms where applicable. Malformed usage returns exit code 2; safety blocks return exit code 3.

## Interactive wrapper

`olympus interactive` presents a compact command hub for status/setup, inspect, evaluate, install and uninstall dry-run/apply, verify/acceptance, catalog/spec, extension create/inspect, reports, RTK/compact, and safety/policy/sandbox status. It shows the current project root, project-local `.pi/olympus` path, and the global-write warning. Apply flows show dry-run output first and require confirmation. It must route behavior through the same service modules as the low-level CLI.

## Setup and state parity

`setup status` is read-only. It detects Bun from the current runtime/PATH, scans PATH for Pi and RTK without executing them, and reports project-local `.pi`, `.pi/olympus`, settings, manifest, lock, audit, quota profile, package mirror, and drift status. It does not install toolchains, run package managers, or mutate global homes. `state inspect` and `state status` are aliases for the current Olympus status report.

## Reporting and efficiency commands

Track C reporting commands are read-only by default. They emit deterministic JSON with schemaVersion 1 and redact secret-looking compacted output before summaries. `rtk status` detects an RTK executable on PATH without executing it and marks RTK-backed paths as preferred for shell output, read, grep/find/rg, git diff/status/log, test output, and package-manager logs. `rtk plan <command...>` classifies an output-heavy command and reports RTK-preferred plus fallback command forms without executing either RTK or the command. If RTK is unavailable, reports include an explicit degraded/fallback reason.

Durable reporting writes are explicit only. `report status --write`, `report handoff --write`, `report acceptance --write`, and `handoff current --write` write only under project-local `.pi/olympus/**` paths. Handoff writes may accept the Pi footer statusline string and parse the context segment that installed `@earendil-works/pi-coding-agent` renders from `ctx.getContextUsage()` / `AgentSession.getContextUsage()`, such as `52.5%/272k (auto)` or `?/200k (auto)`. Olympus then includes post-handoff `/compact` advice when the parsed context percentage is at or above the configured threshold. Olympus reports the exact next command `/compact`; it does not execute Pi commands.

`audit append` is the explicit project-local audit write command. It requires `--apply` and appends only to `.pi/olympus/audit.jsonl`.

`quota status` reads only project-local `.pi/olympus/quota/profile.json` when present. Supported user labels are `plus`, `pro-5x`, `pro-20x`, and `unknown`; provider limits remain `unknown` unless observed by a provider source.

`lock queue <paths...>` is read-only. It reports deterministic queue keys for future parallel writes so manifest, lock, settings, audit, and source-file mutations can be serialized before any writer is enabled.

`profile status` and `profile set` are Olympus-owned project-local UX only. They do not restore legacy provider-renderer profiles and never write global Pi state.

## Safety/runtime commands

Track A safety commands are read-only by default unless explicitly marked `--apply`. `safety check` runs deterministic Themis policy fixtures; `hooks policy` reports the non-executing Olympus-owned Aegis skeleton; `hooks aegis-runtime` reports the explicit first-party Pi extension entrypoint that can be loaded with `pi -e` and uses Pi's live event API to fail-close blocked `tool_call` events; `hooks aegis-install --project --apply` copies that first-party entrypoint only into project-local `.pi/extensions`; `sandbox check` reports sandbox readiness and fake-home secret denial without executing untrusted package code; `broker validate` accepts only typed read-only git, gh, and registry request schemas and denies arbitrary shell strings; `trust status` reports unsigned, locked, hash-mismatch, trusted-passive, executable-blocked, sandbox, home-denied, and network-denied signage; `trust executable-proof` proves manifest, lock, signature-subject digest, sandbox, home-denial, and network-denial gates without loading executable package code; `trust executable-load --apply` enables a staged executable package only in project-local Pi settings after those gates pass.

## Authoring/workflow commands

Track B authoring commands are read-only by default unless explicitly marked `--apply`. `resources validate` validates Olympus-owned skill/prompt/command metadata, provenance, support files, and command collisions. `resources install --project --apply` explicitly installs only first-party Olympus resources into project-local Pi settings and manifest-owned `.pi/olympus/**` paths. `prompt contract` emits deterministic prompt-contract JSON preserving user paths and constraints. `review plan` and `review diff` emit digest-backed review artifacts without external servers. `handoff current` emits compact Hermes handoff summaries without altering decisions. `module status` and `module run <module> --dry-run` expose bounded Olympus module shells; `module hephaestus proof` proves approved plan digest, path allowlist, manifest ownership, and Themis approval; `module hephaestus apply --apply` writes only the approved operation paths when proof and queue gates pass.
