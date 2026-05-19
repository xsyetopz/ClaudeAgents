# Roadmap Parity Spec

This spec lists planned OAL parity themes as future Olympi work. It is not an implementation claim for 0.1.0.

Implemented foundation in this slice:

- Package-API goal-loop state model with blocker-aware pause, verification gate, continuation recovery, and bounded retry state.
- Package-API hook interface with pre-action, validation, architecture-boundary, blocked-state, stop, and commit-adjacent phases.
- Package-API topical skill registry with lazy loading and generalized skill-refinement proposals.

Remaining planned areas:

- Provider-loaded hook deployment with explicit policy, provenance, and fixtures beyond the first-party Aegis skeleton.
- Full skills, prompts, and commands with authoring, validation, and install contracts beyond initial first-party resource metadata and package-API registry.
- RTK/token-efficiency and output compaction that preserve safety-relevant context.
- Plan and diff review workflows.
- Prompt contracts and prompt-quality checks.
- Read-only teams/subagents with bounded context and no uncontrolled swarm execution.
- Quota and usage awareness without hardcoded unstable vendor limits.
- Sandbox, trust, and host-broker hardening for executable resources.

Acceptance for any future item requires implementation, targeted tests, docs/spec updates, and no default global writes.
