# OAL Lessons Retained by Olympus

This page is historical context. OAL was the previous product direction studied during the Olympus rewrite. Active Olympus behavior is defined by `packages/olympus`, `docs/`, and `specs/`.

## Retained lessons

- **Source/compile/deploy/acceptance mental model** — keep a clear path from declared resources to generated reports and verification evidence.
- **Manifest-backed ownership** — mutating operations need explicit ownership records and uninstall authority.
- **Dry-run then apply** — users should review planned writes before mutation.
- **Acceptance simulation** — temp projects and fake homes catch accidental global writes.
- **Hook fixtures** — future hook support needs explicit fixtures before trust.
- **Provenance and hashing** — package files and support files should be inventoried with hashes.
- **Inspection/reporting** — humans and agents need readable status, catalog, and risk reports.
- **Durable state** — handoff files should explain what was done and what remains.

## Rejected patterns

- Active compatibility mode for legacy naming.
- Multi-provider artifact rendering as the core product.
- Provider plugin synchronization as a default workflow.
- Release or installer flows that are not backed by current implementation.
- Executing untrusted package code before sandbox, trust, and broker policies exist.
