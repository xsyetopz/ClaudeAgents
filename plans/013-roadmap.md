# Roadmap

## Phase 0: Plan Pack

Acceptance:

- `/plans/` exists.
- all core specs exist.
- all platform specs exist.
- ADRs exist.
- platform claims are sourced or marked `UNKNOWN`.

## Phase 1: Source Model

- define `source/harness`
- define schemas
- define adapter registry
- add docs evidence checker

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

1. Codex CLi
2. OpenCode
3. Claude Code
4. Gemini CLI
5. Cline
6. Cursor IDE
7. Windsurf
8. Amp
9. Augment
10. Kilo Code

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
