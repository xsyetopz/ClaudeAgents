# Phase 01 Design — Olympus CLI System

## Status

Design only. The low-level CLI is the source of truth; the interactive wrapper is only orchestration UX.

## Binary and package boundary

- Binary name: `olympus`.
- Initial implementation package: `packages/olympus`.
- No `oal` compatibility alias.
- No global writes unless a future command explicitly requires a high-risk scope.

## Low-level command contract

| Command | Purpose | Mutation policy |
| --- | --- | --- |
| `olympus inspect <local-package-path>` | Read package metadata/files, discover Pi resources, classify passive/executable, hash resources, print report | Read-only |
| `olympus package evaluate <source>` | Full package decision report with conflicts, trust recommendation, and installability | Read-only until later source fetch support is designed |
| `olympus plan <operation>` | Explain intended file/settings changes before applying | Read-only |
| `olympus lock <source>` | Record reviewed digest/inventory/trust metadata | Project-local write only after dry-run/apply contract exists |
| `olympus trust <package-id>` | Record trust decision bound to digest/inventory/capabilities | Project-local; executable trust deferred until sandbox support |
| `olympus untrust <package-id>` | Revoke trust and block future Olympus-mediated use | Project-local |
| `olympus install <source> --project` | Install approved passive resources through Olympus-owned Pi mirror | Dry-run first; apply only with explicit flag/confirmation |
| `olympus uninstall <package-id> --project` | Remove only manifest-owned mirror/settings entries with hash match | Dry-run first; manifest authority only |
| `olympus extension create <name>` | Generate Olympus-owned first-party Pi extension skeleton | Project-local generated files only after manifest support |
| `olympus extension inspect <path>` | Inspect a first-party or third-party extension entrypoint without execution | Read-only |
| `olympus sandbox check` | Probe OS sandbox backend availability with temp roots/fake secrets | No untrusted package execution |
| `olympus verify` | Run deterministic checks/fixtures for current project state | Read-only except temp dirs |
| `olympus audit` | Print lock/manifest/trust/audit status | Read-only |

Phase 02A, if selected later, should implement only the read-only subset needed for `inspect`.

## Global CLI invariants

- Every command has `--json` for machine-readable output once implemented.
- Mutating commands support dry-run and must not apply on ambiguous prompts.
- Read-only commands never write to `.pi`, `~/.pi`, package directories, lockfiles, or manifests.
- Local path package inspection must not invoke package managers or lifecycle scripts.
- Error output distinguishes malformed input, blocked risk, missing feature, and internal failure.
- Exit codes should be stable:
  - `0`: success;
  - `1`: validation/risk findings for human attention;
  - `2`: malformed usage/input;
  - `3`: safety block;
  - `4`: unavailable platform/backend;
  - `5`: internal error.

## Inspection report shape

The inspect command should eventually return:

```json
{
  "schemaVersion": 1,
  "package": {
    "name": "example",
    "version": "0.1.0",
    "sourceType": "local",
    "source": "/abs/path",
    "contentDigest": "sha256:..."
  },
  "piManifest": { "present": true, "paths": [] },
  "resources": [
    {
      "id": "skill:foo",
      "kind": "skill",
      "path": "skills/foo/SKILL.md",
      "passive": true,
      "executable": false,
      "hash": "sha256:...",
      "supportFiles": []
    }
  ],
  "executables": [],
  "scripts": [],
  "warnings": [],
  "decision": "inspect-only"
}
```

## Interactive wrapper contract

The high-level interactive CLI may provide guided workflows such as:

- inspect a local package;
- compare package conflicts;
- generate a first-party extension;
- explain trust and sandbox labels;
- preview passive install/uninstall;
- run verification.

It must call the low-level command/library for all business rules. It must not maintain a separate resource parser, trust policy, or manifest writer.

## Project-local install boundary

Later install commands write only these project-local Olympus-owned paths:

```text
.pi/settings.json
.pi/olympus/olympus.lock
.pi/olympus/olympus-manifest.json
.pi/olympus/audit.jsonl
.pi/olympus/packages/<package-id>/package/**
```

They do not write:

- `~/.pi/**`;
- `.pi/extensions/**`, `.pi/skills/**`, `.pi/prompts/**` directly;
- OAL source/spec/test files;
- active product docs as part of install.

## Future Pi extension UX

A future Olympus Pi extension/package may register `/olympus` commands inside Pi, show status, and invoke the shared CLI/library. It may not execute untrusted package code or bypass the CLI trust/sandbox policy.

## CLI boundaries from OAL

Retained patterns:

- low-level scriptable commands under a single binary;
- dry-run/preview before mutation;
- inspect and acceptance as first-class commands.

Rejected patterns:

- broad OAL command surface before Pi package boundaries are executable;
- `oal` binary compatibility;
- provider-specific subcommands as initial product scope;
- setup flows that write persistent user locations before manifest support.
