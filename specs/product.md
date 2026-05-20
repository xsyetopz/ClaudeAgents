# Product Contract

Olympi is a first-party Pi extension/harness layer for agentic coding workflows.
The contract is defined by the intended product purpose, not by whatever the
current source tree happens to contain.

## Primary runtime decision

Olympi's primary runtime is inside Pi. Pi is the host/runtime environment, and
Olympi wraps Pi workflows with goal state, planning, execution governance,
hooks, skills, code intelligence, provenance, blockers, verification, and
reporting. Pi invokes Olympi through the default project-local extension
entrypoint, explicit global registration, or an explicit `pi -e` path. The `olympi` binary may exist, but it is a
development/admin entrypoint for setup, status, verification, and project-local
state, not the product runtime identity. Olympi owns `.pi/olympi/**`, its
manifest-owned project `.pi/settings.json` entries, and
`.pi/extensions/olympi-aegis.ts` only when explicitly installed. It writes
project-local state by default after explicit mutating commands and writes
global `~/.pi/agent/**` only with explicit `--global` confirmation/provenance. It is not
a global provider-home renderer, or a standalone replacement for Pi.

## Install/runtime decision

- Project-local Pi install/registration is the default.
- Global Pi install/registration is supported only with explicit `--global`,
  confirmation, and provenance gates.
- A package-manager global `olympi` binary, when present, is CLI-only and does
  not imply global Pi state.
- Project install installs the Olympi Pi extension entrypoint and project-local
  Pi/Olympi state/resources; it does not install Olympi itself.
- Pi owns user-global settings, sessions, auth, global extensions, and package
  caches. Olympi owns project-local `.pi/olympi/**` and manifest-owned project
  entries.

## Intended product

- Simple user path: a user gives a goal; Olympi prepares, plans, executes
  governed work, verifies, reports concrete blockers, and hides internals by
  default.
- Developer and power path: developers can inspect goals, plans, team plans,
  execution state, hooks, skills, provenance, verification, and reports; they can
  configure autonomy and understand blocked decisions.
- Governed execution: planned work executes through policy/provenance checks,
  hook pipelines, relevant skill loading, mutation confirmation, blocker
  handling, and verification-gated completion.
- Agentic capability: durable goal state, continuation recovery, bounded team
  orchestration for independent work, and parent-owned integration reduce model
  babysitting without claiming fake swarms or provider agents.
- Product honesty: supported behavior is documented as supported; excluded
  behavior is named as a product exclusion; missing intended behavior must be
  implemented or reported with a concrete blocker.

## Implemented

- CLI install/admin/bootstrap wrapper; Pi is the workflow interaction surface.
- Local package inspection without code execution.
- Passive/executable resource classification and hashing.
- Package risk evaluation.
- First-party extension skeleton create/inspect commands.
- Project-local passive install and manifest-backed uninstall.
- Status, doctor health checks, internal dev catalog/spec, acceptance, handoff, and package-risk
  reports.
- Explicit project-local report, audit, and handoff artifact writes.
- Pi statusline parsing and `/compact` advice; the command is recommended, not
  executed.
- Automatic RTK command proxy routing with unsupported-command pass-through and
  anti-bypass hook enforcement.
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
  pause state, bounded retry, saved-state planning, continuation
  recovery/resume, governed command execution, policy/hook/skill/provenance
  execution records, and verification-gated completion.
- Bounded team orchestration planning for independent saved goal steps with
  explicit path ownership, worker assignments, evidence requirements, overlap
  blocking, and parent integration step creation.
- Project-local code intelligence with repo-map state at
  `.pi/olympi/code-intelligence/repo-map.json`, TypeScript/JavaScript structural
  parsing, Tree-sitter CLI availability detection, LSP availability reporting,
  context packets, and goal/team/execution/report integration.
- Internal provider-event policy fixtures for parser/conformance tests only;
  provider runtime launch is not a product surface.
- Executable package intake classification, hashing, trust signage, and policy
  gates; live executable-resource brokering is not a product surface.
- Repo-local feedback items at `.pi/olympi/feedback/items.json`, classified as
  implemented, rejected, or blocked with a concrete reason.
- Hook pipeline model: typed phases, deterministic decisions, and veto results.
- Skill registry model: topical metadata, lazy loading, model-tier hints, and
  generalized refinement proposals.

## Non-goals

- Stable public API.
- Global Pi installation.
- Provider-renderer profile writes.
- Automatic execution of Pi `/compact`.
- Execution of untrusted or unproven executable resources.
- Provider runtime launch.
- Live executable-resource host brokering.
- Release archives, registry publishing, or package-manager distribution.
- Unbounded teams/subagents or provider-native swarm execution.
- Completion without objective-specific verification evidence.
