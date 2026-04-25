# ADR-0001: Language and Runtime Split

## Status
Accepted

## Context

v4 needs adapter rendering, install orchestration, command normalization, docs generation, and cross-platform validation. v3 JavaScript can move fast but shell command correctness and token filtering need stronger determinism.

## Decision

- TypeScript owns harness logic.
- Rust owns command/token runner.
- Markdown owns specs and rationale.
- Shell/PowerShell only bootstrap.

## Consequences

Easier:

- fast adapter work
- schema-driven rendering
- native package ecosystem integration
- deterministic command execution

Harder:

- two build toolchains
- runner packaging
- cross-language tests
