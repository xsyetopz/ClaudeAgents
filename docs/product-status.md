# Product Contract Status

The product contract comes from Olympi's intended purpose: a first-party Pi
extension/harness for agentic coding workflows, with simple goal entry, governed
execution, project-local Pi/Olympi provenance, blocker-aware continuation,
verification-gated completion, reporting, and safe escalation to developer
control. Pi invokes Olympi as an extension; the CLI is a development/admin
entrypoint for install, doctor, status, developer verification, and project-local state, not a
standalone replacement for Pi.

This document is not a backlog. It records current product decisions,
implemented behavior, and enforced exclusions.

## Implemented contract

- Package inspection and passive project-local install.
- Manifest-backed uninstall.
- Static extension inspection and first-party extension skeletons.
- Safety policy decisions and Aegis runtime entrypoint.
- Explicit project-local Aegis extension install for Pi invocation.
- Goal-loop state model with blockers, verification gate, bounded retry, and
  continuation recovery.
- Pi slash surfaces for create, plan, resume, governed explicit-command
  execution, and verification-gated completion.
- Project-local code intelligence: repo map, package/module boundaries,
  imports/exports, public symbols, entrypoint/test hints, changed-file hints,
  concise context packets, Tree-sitter CLI detection, TypeScript AST fallback,
  and explicit LSP-unavailable reporting.
- Bounded team orchestration plans for independent saved goal steps with
  explicit path ownership, overlap checks, evidence requirements, and parent
  integration.
- Internal provider-event fixtures for policy parser/conformance coverage;
  provider runtime launch is outside the Olympi product surface.
- Executable package intake classification, hashing, trust signage, and policy
  gates; live executable-resource host brokering is outside the product surface.
- Repo-local feedback records for user corrections, failed verification,
  repeated blockers, command-surface gaps, stale docs/help, policy/hook/skill
  gaps, code-intelligence gaps, provider gaps, and broker/sandbox gaps.
- Handoff reports include saved goal status and execution counts.
- Hook phase and veto API.
- Topical skill registry, lazy loading in governed goal execution, and
  refinement proposal API.

## Product exclusions

- Provider runtime launch is outside the Olympi product surface. Any
  provider-shaped fixtures remain internal policy/conformance tests.
- Live third-party executable-resource brokering is outside the Olympi
  product surface. Executable resources remain package intake material unless
  trusted by manifest/lock/signature/sandbox gates.
