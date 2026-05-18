# Olympus Security

Olympus 0.1.0 is designed to inspect, evaluate, and mirror local Pi resources conservatively. It is not a sandbox for arbitrary third-party code.

## Threat model

Olympus assumes a local Pi package may contain misleading metadata, executable files, lifecycle scripts, hooks, tools, provider adapters, or extension code. The 0.1.0 safety goal is to inspect and classify those files without executing them, then allow only passive resources into project-local, manifest-owned mirrors.

## Current protections

- Package inspection and evaluation read files only; they do not run lifecycle scripts, package scripts, extension code, hooks, tools, or providers.
- Executable resources are classified conservatively and blocked from default passive install.
- Extension inspection reads `olympus-extension.json` and source-shape metadata without importing or running extension code.
- Applied install writes only Olympus-owned project-local `.pi/olympus/**` files plus managed `.pi/settings.json` package entries.
- Applied uninstall removes only manifest-owned resources with matching hashes.
- Hash mismatches are preserved for manual review.
- Verification uses temporary projects and fake homes to check no-global-write behavior.

## Current non-guarantees

Olympus 0.1.0 does not provide:

- safe execution of untrusted third-party extensions, tools, hooks, providers, package scripts, or lifecycle scripts;
- user-global Pi installation safety;
- operating-system sandbox containment;
- brokered access to host credentials, shells, files outside the project, network services, or external APIs;
- supply-chain verification beyond local file hashing and conservative resource classification.

## Reporting vulnerabilities

Please report security issues privately to the repository maintainers. Include:

- affected command and Olympus version or commit;
- reproduction steps using temporary projects or fake homes where possible;
- observed file writes, code execution, or boundary violation;
- expected safety boundary.

Do not include real secrets in reports.
