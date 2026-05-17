---
name: olympus-implementation
description: Controls the Pi-first Olympus rewrite inside the existing OAL repository. Use when running an Olympus phase, studying OAL architecture, creating oal_legacy, designing the PiCodingAgent-first harness extension, or implementing Olympus from olympus-impl state.
---

# Olympus Implementation

## Authority

The only authoritative temporary controller is `olympus-impl/`.

Read `olympus-impl/00_AUTHORITY.md` before changing product architecture.

## Operating Rule

This is greenfield by re-authoring, not migration.

OAL is studied as the original architecture and pipeline. Good ideas are retained as decisions and re-authored into Olympus. Bad structures are replaced. Existing linting, package, workspace, CI, test, TypeScript, formatting, and build configs are not removed just because they are old.

## Phase Rule

- Phase 00: formal study of original OAL architecture and the entire pipeline.
- Phase 01: design the PiCodingAgent-first Olympus harness extension.
- Phase 02+: implementation.

No destructive implementation before phase 00 and phase 01 are complete.

## Legacy Reference Rule

Create `oal_legacy/` as a gitignored reference snapshot of original OAL before destructive cleanup. Use it as read-only reference material during implementation.

## Required State Updates

At the end of every phase, update:

- `olympus-impl/CHECKLIST.md`
- `olympus-impl/state/current.md`
- `olympus-impl/state/next.md`
- `olympus-impl/logs/phase-XX.md`

## Blockers

If blocked by external credentials, unavailable Pi package registry access, missing local binary, or human decision, write:

- `olympus-impl/state/blocker.md`

Do not harden unrelated code when blocked.
