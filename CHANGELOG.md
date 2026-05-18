# Changelog

All notable active product changes for Olympus are documented here.

## 0.1.0 - Source-checkout product boundary

### Added

- Established Olympus as the active PiCodingAgent-first product in this repository.
- Added low-level CLI commands for inspect, package evaluation, catalog/spec output, status, plan, verify, extension create/inspect, project-local install, and manifest-backed uninstall.
- Added a high-level interactive wrapper routed through the same service code.
- Added project-local passive package mirroring under `.pi/olympus/**` with lock, manifest, audit, hashes, and settings merge/unmerge behavior.
- Added deterministic verification fixtures for inspect/evaluate, install, uninstall, hash mismatch, catalog/spec, and fake-home no-global-write behavior.
- Added compact Olympus 0.1.0 docs and specs.

### Changed

- Replaced historical active product surfaces with the Olympus CLI, package/resource inspection, extension authoring, project-local install/uninstall, status, catalog/spec, and verification workflows.
- Adapted root package scripts, TypeScript, Biome, and CI checks to target Olympus.
- Preserved the legacy reference snapshot as `oal_legacy/` and protected `third_party/` reference material pending a separate policy.

### Safety

- Inspection, evaluation, status, catalog/spec, verification, and extension inspection do not execute third-party package code.
- Executable resources are blocked from default passive install.
- Applied install/uninstall stays project-local and manifest-owned.
- Commands do not write to `~/.pi` by default.

### Known gaps

- No global install support.
- No untrusted executable package execution.
- No sandbox, trust broker, or host capability broker.
- No release archives, package registry publishing, or platform package-manager distribution.
- Roadmap parity features remain planned rather than implemented unless documented in the 0.1.0 specs as active behavior.
