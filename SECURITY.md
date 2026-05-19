# Security

The 0.1.0 security model is inspection without execution. Local Pi packages are
untrusted input.

## Threat model

A package may contain misleading metadata, executable files, lifecycle scripts,
hooks, tools, provider adapters, or extension code. Inspection must classify and
hash those files without running them. Only approved passive resources may be
mirrored into project-local manifest-owned paths.

## Current protections

- Inspect/evaluate do not run package scripts, lifecycle scripts, extension
  code, hooks, tools, or providers.
- Extension inspection parses metadata and source text without importing code.
- Executable resources are blocked from default passive install.
- Applied install writes only `.pi/settings.json` and `.pi/olympi/**` paths.
- `.pi/settings.json` package entries are user-owned unless Olympi manifest and
  hash provenance prove ownership; ambiguous entries must not be overwritten.
- Applied uninstall removes only manifest-owned files with matching hashes.
- Hash mismatches preserve files for manual review.
- Revert-like, delete, move, broad formatter, stage, and commit operations on
  ambiguous workspace paths are blocked until ownership proof or explicit user
  approval is present.
- Verification uses temporary projects and fake homes.

## Current non-guarantees

0.1.0 does not provide:

- safe execution of untrusted third-party code;
- OS sandbox containment;
- access brokering for credentials, shell, filesystem, network, or external
  APIs;
- remote supply-chain verification;
- global Pi installation safety.

## Reporting vulnerabilities

Report security issues privately to the maintainers. Include:

- affected command and commit;
- reproduction steps using temporary projects or fake homes when possible;
- observed writes, execution, or boundary violation;
- expected boundary.

Do not include real secrets.
