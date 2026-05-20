# Install and Uninstall Contract

The current install/uninstall contract supports project-local Pi extension
entrypoint install, project-local package/resource install, and manifest-backed
uninstall. Project-local install is the default; global Pi extension
registration is supported only with explicit `--global` confirmation/provenance.

## Pi extension entrypoint install

`install --dry-run` previews the default project-local first-party Olympi Aegis
extension entrypoint. `install --apply` writes only:

```text
.pi/extensions/olympi-aegis.ts
```

Pi invokes Olympi by auto-discovering that project extension, or by an explicit
`pi -e <olympi-runtime-path>` one-off invocation. `install --global --dry-run`
previews global registration at `~/.pi/agent/extensions/olympi-aegis.ts`; global
apply requires `--global --apply --confirm-global --provenance
explicit-user-approval`. The `olympi` CLI remains a development/admin entrypoint
and is not the primary runtime.

## Package/resource install

`install <source> --project --dry-run` previews writes. `install <source> --project --apply` performs approved writes:

```text
.pi/settings.json
.pi/olympi/olympi.lock
.pi/olympi/olympi-manifest.json
.pi/olympi/audit.jsonl
.pi/olympi/packages/<package-id>/package/**
```

Executable resources block passive install. User-global `~/.pi/agent/**` writes
are out of scope except for explicit global extension registration with the
gates above.

## Settings merge

Olympi updates project `.pi/settings.json` only for its package mirror entry. Existing unrelated settings must be preserved.

## Uninstall

`uninstall <package-id> --project --dry-run` previews removals. `--apply` removes only files and settings entries owned by `.pi/olympi/olympi-manifest.json` and matching recorded hashes.

Hash mismatches are preserved and reported for manual review.
