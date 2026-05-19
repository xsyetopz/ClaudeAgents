# Product Contract

0.1.0 provides local Pi package inspection, risk evaluation, first-party
extension skeleton authoring, project-local passive resource mirroring,
manifest-backed uninstall, and package APIs for goal-loop, hook, and skill state.

## Implemented

- CLI and interactive wrapper.
- Local package inspection without code execution.
- Passive/executable resource classification and hashing.
- Package risk evaluation.
- First-party extension skeleton create/inspect commands.
- Project-local passive install and manifest-backed uninstall.
- Status, setup status, catalog/spec, acceptance, handoff, and package-risk
  reports.
- Explicit project-local report, audit, and handoff artifact writes.
- Pi statusline parsing and `/compact` advice; the command is recommended, not
  executed.
- RTK status, command-form planning, and fallback compaction.
- Quota labels without provider-limit claims.
- Safety policy checks, Aegis policy skeleton, and explicit Aegis project
  extension install.
- Sandbox probes and read-only broker schema validation.
- Executable package staging/loading only after manifest, lock, signature, and
  sandbox proof gates pass.
- Trust status and executable trust proof reports.
- First-party resource metadata validation and project-local install.
- Prompt contracts, plan/diff review artifacts, Hephaestus apply gates, Hermes
  handoff summaries, mutation queue planning, profile state, and bounded module
  shells.
- Goal-loop state model: objective, planned steps, ledger, blocker detection,
  pause state, bounded retry, verification gate, and continuation recovery.
- Hook pipeline model: typed phases, deterministic decisions, and veto results.
- Skill registry model: topical metadata, lazy loading, model-tier hints, and
  generalized refinement proposals.

## Non-goals

- Stable public API.
- Global Pi installation.
- Legacy provider-renderer compatibility.
- Automatic execution of Pi `/compact`.
- Execution of untrusted or unproven executable resources.
- Live host capability broker execution.
- Release archives, registry publishing, or package-manager distribution.
- Unbounded teams/subagents.
- Completion without objective-specific verification evidence.
