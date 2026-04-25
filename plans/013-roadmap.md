# Roadmap

## Phase 0: Plan Pack

Acceptance:

- `/plans/` exists.
- all core specs exist.
- all platform specs exist.
- ADRs exist.
- platform claims are sourced or marked `UNKNOWN`.
- source dives exist for Codex, OpenCode, Claude Code sourcemap, Kilo Code v5 legacy, and Windsurf.
- Mermaid flow diagrams exist for runtime and install/uninstall paths.

## Phase 1: Source Model

- define `source/harness`
- define schemas
- define adapter registry
- add docs evidence checker
- add source-evidence manifest that links platform support to source paths or official docs

## Phase 2: Command Core

- create Rust runner crate
- implement command DSL
- replace RTK-memory dependency with harness command routing
- add token-saving regression tests

## Phase 3: Generator Split

- keep thin generator
- add platform renderer modules
- remove v3 generated assumptions
- add generated contract tests

## Phase 4: Native Adapters

Implement in priority order:

1. Codex CLI
2. OpenCode
3. Claude Code
4. Gemini CLI
5. Cline
6. Cursor IDE
7. Windsurf Editor
8. Amp
9. Augment
10. Kilo Code v5 legacy

## Phase 5: Installer Rewrite

- TypeScript installer
- shell launchers only
- v4 manifest
- dry-run
- temp-home install smoke

## Phase 6: Uninstaller Rewrite

- v4 manifest cleanup
- known v3 residue cleanup
- temp-home uninstall smoke
- no unmarked user-file deletion

## Phase 7: Public Docs Rewrite

- README v4 only
- architecture v4 only
- platform docs regenerated from plan evidence
- changelog entry
