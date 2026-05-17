# Olympus Implementation Phases

Each phase is one Pi session. Do not merge phases.

## Phase Sequence

- [ ] Phase 00 — Formal study of original OAL architecture and entire pipeline
- [ ] Phase 01 — Design PiCodingAgent-first Olympus harness extension
- [ ] Phase 02 — Create protected legacy snapshot and root implementation plan
- [ ] Phase 03 — Implement Olympus low-level CLI package boundaries
- [ ] Phase 04 — Implement Olympus Pi extension authoring/evaluation system
- [ ] Phase 05 — Implement high-level interactive CLI wrapper
- [ ] Phase 06 — Implement verification, install, uninstall, and fixture system
- [ ] Phase 07 — Re-author retained good OAL ideas under Olympus names/contracts
- [ ] Phase 08 — Destructive cleanup after replacement and legacy snapshot
- [ ] Phase 09 — Final acceptance sweep and bootstrap removal readiness

## Phase Output Standard

Every phase writes:

- `olympus-impl/logs/phase-XX.md`
- updated `olympus-impl/state/current.md`
- updated `olympus-impl/state/next.md`
- updated `olympus-impl/CHECKLIST.md`

## Stop Standard

Do not continue into the next phase in the same session.

## Destructive Work Gate

No destructive cleanup is allowed until phases 00, 01, and 02 are complete.
