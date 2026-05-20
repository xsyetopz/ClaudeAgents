# Documentation

This directory documents Olympi's intended product contract and the active
source-tree behavior. Start with the product/use docs before architecture docs.

## Use docs

- Quick start and normal use: [`../README.md`](../README.md) and [`../INSTALLATION.md`](../INSTALLATION.md).
- Product surface split: [`product-surface.md`](product-surface.md) — default user workflow, developer/power workflow, debug/internal workflow, and hidden internals.
- Developer/power verification: [`verification.md`](verification.md).
- Safety and provenance: [`security.md`](security.md), [`hooks.md`](hooks.md), and [`package-model.md`](package-model.md).
- Extension points: [`extensions.md`](extensions.md), [`skills.md`](skills.md), and [`package-boundaries.md`](package-boundaries.md).

## Core documents

- [`product-surface.md`](product-surface.md) — Apple-style user/developer/debug split and command disclosure rules.
- [`architecture.md`](architecture.md) — package layout, state ownership, and major data flows.
- [`package-boundaries.md`](package-boundaries.md) — package responsibilities and dependency rules.
- [`execution-lifecycle.md`](execution-lifecycle.md) — inspect/evaluate/plan/apply/report lifecycle and blocker behavior.
- [`hooks.md`](hooks.md) — hook phases, veto semantics, and explicit runtime boundaries.
- [`skills.md`](skills.md) — topical skill selection, lazy loading, and refinement loops.
- [`package-model.md`](package-model.md) — Pi package inventory and project-local mirror layout.
- [`verification.md`](verification.md) — local gates and fixture coverage.
- [`acceptance-audit.md`](acceptance-audit.md) — implementation audit matrix
  mapping commands/APIs, code paths, tests, docs/help, and verification.
- [`agent-behavior-evidence.md`](agent-behavior-evidence.md) — inspected failure modes and enforcement points for agent behavior guardrails.
- [`cli-ux-evidence.md`](cli-ux-evidence.md) — evidence behind the CLI and onboarding shape.
- [`security.md`](security.md) — threat model and current non-guarantees.
- [`extensions.md`](extensions.md) — first-party extension skeletons and inspection.
- [`product-status.md`](product-status.md) — product contract status and enforced boundaries.

## Normative specs

The specs in [`../specs`](../specs/README.md) define the intended product and command contracts. Update specs when command behavior, write paths, safety boundaries, or verification requirements change.
