# Language and Runtime Decision

Decision: TypeScript first, Rust surgically, Markdown as plan/spec memory, shell only as launcher.

OpenAgentLayer names:

- TypeScript packages use `@openagentlayer/*`.
- Rust crates use `oal-*`.
- Command runner binary is `oal-runner`.
- CLI entrypoint is `oal`.

## TypeScript Ownership

TypeScript owns harness intelligence:

- source model loading
- adapter registry
- platform rendering
- install/uninstall orchestration
- JSON/TOML/YAML/Markdown emission
- schema validation
- fixture generation
- docs linting
- test harnesses

Reason: current repo already uses Node/Bun, most target platforms expose JSON/TOML/Markdown surfaces, and adapter work benefits from fast iteration.

## Rust Ownership

Rust owns command truth:

- command parsing and normalization
- compact exec runner
- token accounting
- high-output filtering
- shell-safe cross-platform behavior
- hook helper fast paths
- future RTK replacement or augmentation

Reason: shell parsing and token filtering must be deterministic, fast, and portable. The v4 command core must not be ad-hoc agent-authored scripts.

## Markdown Ownership

Markdown owns human-verifiable planning:

- `/plans/` specs
- platform evidence
- rationale
- roadmaps
- ADRs
- accepted/rejected ideas

Reason: OpenAgentLayer is too broad for one README or one issue. The plan pack is the control plane.

## Shell and PowerShell Ownership

Shell owns only launchers:

- `install.sh`
- `install.ps1`
- `uninstall.sh`
- `uninstall.ps1`

Launchers find Node/Rust binaries and forward arguments. No business logic.

## Rejected Languages

- Python core: encourages one-off inspection scripts and weak packaging discipline.
- Shell core: brittle and hard to validate across Windows/macOS/Linux.
- Go core: acceptable later for a daemon, unnecessary for first harness.
