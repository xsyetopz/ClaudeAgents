# Install and Uninstall Contract

Olympus 0.1.0 supports project-local passive install and manifest-backed uninstall only.

## Install

`install <source> --project --dry-run` previews writes. `install <source> --project --apply` performs approved writes:

```text
.pi/settings.json
.pi/olympus/olympus.lock
.pi/olympus/olympus-manifest.json
.pi/olympus/audit.jsonl
.pi/olympus/packages/<package-id>/package/**
```

Executable resources block passive install. User-global `~/.pi` writes are out of scope.

## Settings merge

Olympus updates project `.pi/settings.json` only for its package mirror entry. Existing unrelated settings must be preserved.

## Uninstall

`uninstall <package-id> --project --dry-run` previews removals. `--apply` removes only files and settings entries owned by `.pi/olympus/olympus-manifest.json` and matching recorded hashes.

Hash mismatches are preserved and reported for manual review.
