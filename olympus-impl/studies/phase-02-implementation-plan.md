# Phase 02 — Implementation Plan for First Safe Vertical Slice

## 1. Bottom line

**Decision:** Phase 02 implements the smallest safe Olympus vertical slice as a **standalone Pi-first CLI** for passive Pi package/resource inspection, locking, project-local install, uninstall, trust/untrust, sandbox probing, and audit reporting.

**Decision:** Phase 02 does **not** execute third-party package code. It detects executable resources and blocks them unless a later phase explicitly gates execution behind trust + lock + OS sandbox.

**Fact:** Phase 01 product contract defines Olympus as Pi-first, project-local by default, OS-sandbox-aware, and not an OAL/provider renderer. Phase 00.6 defines trust/lock/sandbox as separate gates.

## 2. Planned CLI commands

Initial binary: `olympus`.

| Command | Phase 02 behavior |
| --- | --- |
| `olympus inspect <package-source>` | Resolve/read local package source without executing code; inventory Pi resources; classify passive vs executable; show risk/signage. |
| `olympus lock <package-source>` | Produce/update `olympus.lock` entry for inspected content, resource inventory, capabilities, and passive/executable classification. |
| `olympus install <package-source> --project` | Dry-run first; install passive resources project-locally only; executable resources remain blocked. |
| `olympus uninstall <package-id> --project` | Dry-run first; remove only Olympus-manifest-owned project-local files/settings with hash match. |
| `olympus trust <package-id>` | Record trust decision for passive resources only in first slice; executable trust is recorded as blocked/deferred. |
| `olympus untrust <package-id>` | Mark package trust revoked; prevent future install/use through Olympus. |
| `olympus sandbox check` | Probe Linux/WSL2 sandbox backend availability using temp roots only; no untrusted package execution. |
| `olympus audit` | Print lock/manifest/trust/audit status and warnings. |

**Decision:** All mutating commands support/perform dry-run preview before writes. If an `--apply` flag is needed, define it explicitly in implementation; do not mutate on ambiguous prompts.

## 3. Initial supported resources

**Included in first slice:**

- Pi skills: directories with `SKILL.md`.
- Pi prompt templates: Markdown files under prompt resource roots.
- Themes: include only if trivial static copy/inventory through Pi package manifest/conventional dirs.

**Excluded or blocked in first slice:**

- third-party executable extensions;
- custom providers;
- lifecycle scripts;
- package scripts;
- global installs;
- mutating host brokers;
- executable package evaluation.

**Decision:** Mixed packages are allowed for inspection/lock, but install only passive resources if they can be cleanly separated. If not cleanly separable, install is blocked.

## 4. Package source support

**Decision:** Phase 02 source support order:

1. **Local path package**: first and required. Enables architecture validation without network/package-manager execution.
2. **npm tarball/metadata inspection**: plan schema, but implement only if it can fetch/extract without lifecycle scripts and without global install.
3. **git package**: defer unless needed; branch/tag mutability and clone behavior increase scope.

**Decision:** First vertical slice should use local path packages and test fixtures only.

**Unknown:** Whether npm tarball support belongs in Phase 02 or Phase 03 after local path flow is accepted.

## 5. Minimal data schemas

### `olympus.lock`

```json
{
  "lockfileVersion": 1,
  "entries": [
    {
      "id": "local:/abs/path-or-stable-id",
      "sourceType": "local",
      "source": "../path/to/package",
      "resolvedRef": null,
      "version": "0.1.0",
      "contentDigest": "sha256:...",
      "signature": { "status": "unsigned" },
      "resourcesDigest": "sha256:...",
      "resources": ["resource-id"],
      "executables": ["resource-id"],
      "requestedCapabilities": [],
      "approvedCapabilities": [],
      "sandboxProfile": "passive-resource-install",
      "installScope": "project",
      "trust": "trusted-passive|untrusted|revoked",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

### `olympus-manifest.json`

```json
{
  "manifestVersion": 1,
  "ownedArtifacts": [
    {
      "path": ".pi/olympus/packages/<id>/skills/foo/SKILL.md",
      "canonicalPath": "/abs/...",
      "kind": "skill|prompt|theme|settings-entry",
      "packageId": "...",
      "resourceId": "...",
      "hash": "sha256:...",
      "scope": "project",
      "createdAt": "ISO-8601"
    }
  ]
}
```

### `sandbox.json`

```json
{
  "profiles": {
    "inspect-only": { "exec": false, "writes": [], "network": false },
    "passive-resource-install": { "exec": false, "writes": [".pi/olympus"], "network": false },
    "package-eval-offline": { "exec": true, "tempOnly": true, "network": false }
  }
}
```

### Package/resource inventory

```json
{
  "packageId": "...",
  "sourceType": "local|npm|git",
  "piManifest": { "present": true, "paths": [] },
  "resources": [
    {
      "id": "skill:foo",
      "kind": "skill|prompt|theme|extension|provider|tool|hook|script",
      "path": "skills/foo/SKILL.md",
      "passive": true,
      "executable": false,
      "hash": "sha256:...",
      "warnings": []
    }
  ]
}
```

### Trust decision record

```json
{
  "packageId": "...",
  "contentDigest": "sha256:...",
  "decision": "trusted-passive|untrusted|revoked",
  "scope": "project",
  "sandboxProfile": "passive-resource-install",
  "decidedAt": "ISO-8601",
  "reason": "optional user/policy note"
}
```

### Audit event

```json
{
  "time": "ISO-8601",
  "event": "inspect|lock|install|uninstall|trust|untrust|sandbox-check|blocked",
  "packageId": "...",
  "decision": "allow|deny|confirm|dry-run",
  "paths": [],
  "reason": "rule id / human text",
  "redactions": 0
}
```

## 6. Safety model for first slice

**Decision:** Safety rules are release-blocking for Phase 02:

- no execution during inspect;
- no lifecycle scripts;
- no package-manager global install;
- project-local only;
- dry-run before write;
- manifest-backed uninstall only;
- hash mismatch blocks install/load and requires re-lock/re-review;
- passive prompt-injection signage for skills/prompts;
- executable extensions/tools/providers/hooks/scripts detected but blocked;
- signed/verified labels do not bypass policy;
- `unsafe-host` not implemented as a normal workflow.

**Inference:** Phase 02 can provide useful value even without executable extension execution by safely installing/evaluating passive Pi resources.

## 7. Linux/WSL2 sandbox probe plan

`olympus sandbox check` should:

1. detect platform: Linux native vs WSL2 vs macOS;
2. detect `bwrap` or equivalent backend on `PATH`;
3. verify user namespace support with a harmless temp-root command;
4. create temp fake home and temp output root;
5. probe denial of fake home secrets such as `.ssh/id_rsa`, `.config/gh/hosts.yml`, `.pi/agent/auth.json`;
6. probe denial of writes outside output root;
7. probe network-disabled profile only if backend supports it;
8. record status: `strong`, `degraded`, `unavailable`;
9. never run untrusted package code.

**Decision:** WSL2 uses the Linux path, but reports degraded/unavailable if user namespaces or backend behavior fails.

## 8. macOS behavior

**Decision:** Phase 02 macOS support:

- allow `inspect`, `lock`, passive `install --project`, `uninstall --project`, `trust`, `untrust`, `audit`;
- block third-party executable evaluation;
- `sandbox check` reports no strong executable containment unless an approved backend is later added;
- UX explains that `sandbox-exec` is deprecated and temp-home/env isolation is not a strong sandbox.

## 9. Acceptance skeleton

Planned fixtures/tests:

- passive skill installs without executable trust;
- prompt template installs and preserves filename/command behavior metadata;
- executable extension detected and blocked;
- mixed passive/executable package either split-installs passive resources or blocks when inseparable;
- lockfile hash mismatch blocks install/load;
- uninstall preserves user-modified files;
- project install does not touch real/global `~/.pi`;
- Linux/WSL2 sandbox cannot read fake home `.ssh`;
- Linux/WSL2 sandbox cannot read fake `.config/gh`;
- Linux/WSL2 sandbox cannot read fake `.pi/agent/auth.json`;
- sandbox cannot write outside output root;
- `skip-permissions` cannot escape sandbox if flag exists;
- `untrust` blocks future install/execution through Olympus;
- broker arbitrary shell denial only if read-only broker is included later.

**Decision:** Tests use temp directories and fake homes only.

## 10. Proposed repo/package layout

**Decision:** Keep OAL source/spec/tests untouched in Phase 02. Do not delete/move OAL yet.

Proposed additions only:

```text
packages/olympus/                 # standalone CLI/package source
  package.json
  src/
    cli.ts
    commands/
    package-source/
    inventory/
    lockfile/
    manifest/
    trust/
    sandbox/
    audit/
    pi-resources/
  test/
    fixtures/
      pi-passive-package/
      pi-mixed-package/
      pi-extension-package/
    *.test.ts

olympus-impl/studies/             # phase notes only
olympus-impl/logs/                # phase logs if phase controller requires
```

Generated artifacts during tests should live only in temp dirs. Real project-local generated examples, if needed later, should live under an Olympus-owned path such as `.pi/olympus/` and be manifest-owned.

## 11. Phase 02 cut line

Phase 02 will **not** implement:

- Go harness;
- global install;
- executable third-party extension execution;
- custom provider execution;
- lifecycle script execution;
- mutating brokers;
- macOS strong executable sandbox;
- Windows native support;
- legacy OAL provider renderers;
- OAL compatibility bridge;
- OAL plugin payload sync;
- destructive OAL source cleanup.

## 12. Facts, decisions, inferences, unknowns

**Facts:**

- Pi packages/resources support skills, prompts, extensions, and themes.
- Pi extensions/packages can execute with full user permissions without external containment.
- OAL's prior renderer architecture targeted Codex/Claude/OpenCode and is out of active scope.

**Decisions:**

- Standalone CLI first.
- Local path packages first.
- Passive resources first.
- Project-local only.
- Executables detected and blocked.
- Linux/WSL2 sandbox probe first; no untrusted execution.

**Inferences:**

- A useful vertical slice can be delivered without executing third-party code.
- Package/resource inventory, lockfile, and manifest are the core seams for later sandboxed execution.

**Unknowns:**

- Whether npm tarball support fits Phase 02.
- Exact project-local Pi settings mutation format to use without clobbering user config.
- Whether `packages/olympus` should be a separate npm package or workspace-only initially.
- Whether a read-only `gh` broker belongs in Phase 02 or a later broker phase.

## 13. Evidence list

- Phase 00 OAL architecture: `olympus-impl/studies/oal-architecture.md`
- Phase 00 OAL pipeline: `olympus-impl/studies/oal-pipeline.md`
- Phase 00.5 Pi surface report: in-chat report citing `https://pi.dev/docs/latest`
- Phase 00.6 trust/lock: `olympus-impl/studies/phase-00.6-sandbox-trust-lock.md`
- Phase 00.6 OS sandbox: `olympus-impl/studies/phase-00.6-os-sandbox-options.md`
- Phase 00.6 brokers: `olympus-impl/studies/phase-00.6-host-brokers.md`
- Phase 01.5 safety contract: in-chat report
- Phase 01 product contract: `olympus-impl/studies/phase-01-product-contract.md`
