# Package Evaluation Contract

Before installing or executing a third-party Pi package, Olympus records an evaluation decision.

## Required report fields

- package name, version, source type, source/ref/path, and resolved identity;
- package content digest;
- Pi manifest status and conventional resource discovery;
- passive resources: skills, prompts, themes, static support files;
- executable resources: extensions, tools/providers/hooks inferred from extension code, scripts, lifecycle scripts;
- per-resource hashes;
- dependency and lifecycle-script warnings;
- conflicts with existing project/global Pi resources when available;
- signature/provenance labels when available, with the warning that identity is not safety;
- concrete gap the package solves;
- uninstall path and ownership plan;
- decision: `reject`, `inspect-more`, `trust-passive`, `trust-executable-deferred`, `install-passive`, `vendor`, or `fork`.

## Hard rules

- No blind install.
- No package code execution during inspection.
- No lifecycle script execution during inspection.
- Local path package trust binds to current content digest and goes stale on change.
- Executable resources are blocked until trust + lock + capability + sandbox gates exist.
- Global install is blocked by default.
