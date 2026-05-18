# Olympus Implementation Authority

`olympus-impl/` is the temporary phase controller for Olympus planning and handoff files.

## Product authority

Olympus is the active product. Active source and implemented behavior live in `packages/olympus/`, root docs, `docs/`, and `specs/`.

## Phase discipline

- phase-00 is study only.
- phase-01 is design only.
- phase-02 and later are implementation.
- Do not skip the sequence.
- A selected phase must be bounded to its stated prompt and must not begin the next phase.

## Legacy rule

`oal_legacy/` is read-only reference material. It may inspire Olympus-owned designs, but direct copying of legacy or third-party code into active source is forbidden.

## Current session rule

`phase-parity-track-plans` is planning only. It may create and update Olympus implementation plans, reports, phase state, and checklist/log files. It must not implement feature code.
