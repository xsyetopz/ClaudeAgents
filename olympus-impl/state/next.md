# Next Olympus State

Do not begin the next phase in this session.

## Recommended next bounded session

Parity integration acceptance is complete for implemented Track A, Track B, and Track C surfaces. Future owner-selected sessions should be explicitly scoped follow-ups only, for example:

1. Live Pi runtime Aegis integration, if explicitly requested and safety fixtures remain fail-closed.
2. Executable sandbox/trust/signature proof, if explicitly requested.
3. Hephaestus apply-gate proof, still blocked until approved plan digest, path allowlist, manifest ownership, and Themis approval are implemented and tested.
4. Track C RTK command-form hardening or explicit report artifact write commands.
5. Track B TUI preview/editor integration or explicit project-local first-party resource install flow.

## Guardrails for the next session

- Re-read `olympus-impl/00_AUTHORITY.md`, `PHASES.md`, `CHECKLIST.md`, `state/current.md`, `state/next.md`, and the selected prompt before acting.
- Do not skip phase sequence.
- Do not begin multiple phases in one bounded session.
- Do not execute third-party package code.
- Do not write to `~/.pi` by default.
- Do not delete `oal_legacy/` without separate explicit authority.
- Do not enable runtime hook execution beyond the non-executing Aegis skeleton without a future bounded phase.
- Do not enable executable package load until trust + lock + sandbox gates pass.
- Do not enable Hephaestus/apply writes before plan digest + path allowlist + manifest ownership + Themis approval are proven.
- Keep module names as bounded authority codenames, not personas.
- Keep broker operations typed/read-only; no arbitrary shell strings or live credential use by default.
- Keep RTK first-class in output-heavy workflows and record degraded reasons for fallback paths.
- Keep quota values explicitly uncertain unless a provider-observed source supplies them.

## Open inputs to resolve later

- Live Pi runtime Aegis integration strategy.
- Exact sandbox backend and OS-specific executable containment proof.
- Trust/signature persistence format for future executable package gates.
- First-party resources package installation UX beyond explicit generation/validation.
- TUI preview/editor integration for plan/diff review.
- File-level lock/manifest queue design before any safe parallel writes.
- Explicit report/audit/handoff artifact write commands, if owner wants durable CLI writes.
