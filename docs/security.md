# Security Model

The current security model is inspection without execution.

## Current guarantees

- Package inspection and evaluation do not run lifecycle scripts, package
  scripts, extension code, hooks, tools, or providers.
- Extension inspection reads metadata and source shape without importing code.
- Executable resources are blocked from default passive install.
- Apply commands write only documented project-local paths.
- Uninstall removes only manifest-owned files with matching hashes.
- No command writes to `~/.pi` by default.
- Verification includes fake-home checks.

## Current non-guarantees

0.1.0 does not provide:

- safe execution of untrusted packages;
- OS sandbox containment for executable resources;
- brokered access to host credentials or arbitrary shell commands;
- remote package provenance verification;
- global Pi installation safety.

Executable support requires explicit trust proof, sandbox evidence, host broker
policy, and tests before it can become a supported behavior.
