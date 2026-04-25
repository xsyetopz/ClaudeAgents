# ADR-0004: Rust Command Core

## Status
Accepted

## Context

RTK savings are far below target. Prompt reminders do not reliably change agent shell behavior. Command parsing and output filtering must be deterministic.

## Decision

Build a Rust command runner for v4 command normalization, compact output, token accounting, and hook-safe execution.

## Consequences

Easier:

- real shell-shape control
- portable binary
- fast filtering
- fewer ad-hoc scripts

Harder:

- crate packaging
- binary install/update path
- Rust/TypeScript integration tests
