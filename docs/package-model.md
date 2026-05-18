# Package Model

Olympus works with local Pi package paths. It does not install remote dependencies or execute package code during inspect, evaluate, install planning, status, catalog, spec, or verification.

## Resource classes

- **Passive untrusted** — skills and prompts. These may be mirrored after inspection and approval.
- **Passive static** — themes. These are static files and may be parsed when possible.
- **Executable** — extensions, tools, providers, hooks, lifecycle scripts, package scripts, and other code-bearing resources. These are inspected and hashed but blocked from default passive install.

## Local path flow

1. `inspect` reads package metadata and conventional Pi resource locations.
2. `package evaluate` adds risk labels, conflicts, and installability decisions.
3. `install --project --dry-run` previews passive mirror writes.
4. `install --project --apply` mirrors approved passive resources into the current project.
5. `status` reports manifest, lock, audit, and settings state.
6. `uninstall --project` removes only manifest-owned files and matching settings entries.

## Sanitized mirror

Applied install writes to Olympus-owned project-local paths:

```text
.pi/settings.json
.pi/olympus/olympus.lock
.pi/olympus/olympus-manifest.json
.pi/olympus/audit.jsonl
.pi/olympus/packages/<package-id>/package/**
```

The mirror is content-addressed by hashes and tracked in the Olympus manifest. It is not a direct copy into `.pi/skills`, `.pi/prompts`, or user-global `~/.pi`.

## Settings entry

Olympus merges a project-local settings package entry for the sanitized mirror. Uninstall removes only the Olympus-owned entry when the manifest and hashes match.
