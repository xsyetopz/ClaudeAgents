# Product Contract

Olympus 0.1.0 is a PiCodingAgent-first framework for inspecting local Pi packages, evaluating resource risk, authoring first-party extension skeletons, and mirroring approved passive resources into project-local manifest-owned paths.

## Implemented

- Low-level CLI and interactive wrapper.
- Local package inspection and risk evaluation without code execution.
- Passive/executable resource classification and hashing.
- Extension create/inspect flows for Olympus-owned skeletons.
- Project-local passive install and manifest-backed uninstall.
- Status, catalog/spec, verification, deterministic report/handoff/acceptance JSON, RTK status, fallback compaction, quota labeling, safety policy checks, non-executing Aegis hook-policy skeleton, sandbox probes, read-only broker schema validation, trust signage, first-party resource metadata validation, prompt contracts, plan/diff review artifacts, Hermes handoff summaries, bounded module shells, and JSON output where useful.

## Non-goals at 0.1.0

- API freeze or v1 compatibility guarantee.
- Global Pi installation.
- Execution of untrusted executable resources.
- Executable sandbox approval, live trust broker, or host capability broker execution claims.
- Release archives, package registry publishing, or platform package-manager distribution.
- Full parity roadmap for live runtime hooks, executable sandbox approval, TUI review workflows, uncontrolled teams/subagents, or write-capable Hephaestus apply behavior. Initial Track A/B/C surfaces are implemented, but live executable/runtime/write authority remains gated future work and Track C does not claim provider quota authority.
