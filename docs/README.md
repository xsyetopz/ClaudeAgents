# Documentation

This directory documents the active 0.1.0 source-tree system.

## Core documents

- [`architecture.md`](architecture.md) — package layout, state ownership, and major data flows.
- [`package-boundaries.md`](package-boundaries.md) — package responsibilities and dependency rules.
- [`execution-lifecycle.md`](execution-lifecycle.md) — inspect/evaluate/plan/apply/report lifecycle and blocker behavior.
- [`hooks.md`](hooks.md) — hook phases, veto semantics, and provider deployment status.
- [`skills.md`](skills.md) — topical skill selection, lazy loading, and refinement loops.
- [`package-model.md`](package-model.md) — Pi package inventory and project-local mirror layout.
- [`verification.md`](verification.md) — local gates and fixture coverage.
- [`agent-behavior-evidence.md`](agent-behavior-evidence.md) — inspected failure modes and enforcement points for agent behavior guardrails.
- [`security.md`](security.md) — threat model and current non-guarantees.
- [`extensions.md`](extensions.md) — first-party extension skeletons and inspection.
- [`roadmap.md`](roadmap.md) — remaining work.
- [`oal-lessons.md`](oal-lessons.md) — retained lessons from the legacy implementation.

## Normative specs

The specs in [`../specs`](../specs/README.md) define the 0.1.0 command and product contracts. Update specs when command behavior, write paths, safety boundaries, or verification requirements change.
