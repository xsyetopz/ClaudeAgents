# Phase 01 Design — Olympus Verification System

## Status

Design only. Verification must prove Olympus safety behavior without mutating real user Pi state.

## Verification goals

Olympus verification must prove:

1. package/resource discovery is deterministic;
2. passive/executable classification is conservative;
3. no inspect/evaluate path executes package code or lifecycle scripts;
4. project-local install/uninstall is manifest-backed before it mutates files;
5. global Pi state is untouched by default;
6. lock/trust/hash mismatch behavior blocks unsafe use;
7. sandbox probes use fake homes/temp roots and never run untrusted package code;
8. active docs and CLI contracts match implementation when implementation phases begin.

## Test strata

| Stratum | Scope | Required evidence |
| --- | --- | --- |
| Unit tests | Parsers, glob expansion, hashing, classifiers, manifest merge logic | Deterministic fixtures |
| CLI smoke tests | `olympus inspect`, `verify`, later install/uninstall dry-run | Exit code/stdout/stderr/JSON assertions |
| Acceptance simulation | Temp project, fake home, fake package fixtures, mirror install/uninstall | No writes outside temp root |
| Sandbox probes | Linux/WSL2 backend detection with fake secrets | Denial evidence, degraded/unavailable reporting |
| Regression inventory | Checklist that active OAL files are not deleted before gates | Git/tree assertions |

## Required fixtures

Initial package fixtures:

- passive package: skill, prompt, theme, support files;
- mixed package: passive resources plus extension;
- lifecycle-script package: package scripts present but not executed;
- malformed package: bad/missing `package.json`, invalid skill frontmatter, invalid theme JSON;
- collision package: duplicate skill/prompt/theme names;
- support-files package: skill with nested `references`, `scripts`, and `assets` hashed as support files.

Sandbox fixtures use fake homes only:

```text
temp-home/
  .ssh/id_rsa
  .config/gh/hosts.yml
  .pi/agent/auth.json
temp-project/
  .pi/settings.json
  package-under-test/
  output/
```

## Acceptance gates by phase

### Phase 02 / 02A read-only inspect gate

- `olympus inspect <local-package-path>` reads `package.json` without execution.
- Pi resources are discovered from manifest and conventional directories.
- Skills, prompts, and themes are passive.
- Extensions, tools/providers/hooks/scripts/lifecycle scripts are executable.
- All inspected resources and support files are hashed.
- Reports are emitted in human-readable and/or JSON form.
- Tests cover passive, mixed, lifecycle-script, malformed, and skill-support-file fixtures.
- No writes occur to `~/.pi` or project `.pi` except temp test dirs.

### Install/uninstall gate

- Install writes only project-local Olympus-owned paths.
- Install updates only `.pi/settings.json` `packages` entries needed for sanitized mirrors.
- Uninstall removes only manifest-owned entries/files with hash match.
- User-modified files are preserved and reported.
- Original local package source is never mutated.
- Global `~/.pi` is untouched.

### Trust/lock gate

- Trust binds to content digest, inventory, capabilities, sandbox profile, and scope.
- Hash mismatch blocks executable use and requires re-review.
- Passive hash mismatch requires re-confirmation.
- Signed/provenance labels never grant capabilities.
- Revoke/untrust prevents future Olympus-mediated install/execution.

### Sandbox gate

- Linux/WSL2 reports strong only when backend/user namespace probes pass.
- macOS reports degraded/blocked for untrusted executable evaluation unless a credible backend is later selected.
- Sandbox cannot read fake `.ssh`, `.config/gh`, or `.pi/agent/auth.json`.
- Sandbox cannot write outside declared output root.
- `skip-permissions` cannot disable containment.

### Cleanup gate

Before any destructive OAL cleanup:

1. Phase 00 study complete.
2. Phase 01 design complete.
3. Phase 02 legacy snapshot exists and is gitignored.
4. Path has explicit classification.
5. Replacement or deletion reason is documented.
6. Targeted tests/verification pass.

## Verification command contract

`olympus verify` eventually reports:

- package fixture status;
- lock/manifest schema validity;
- project-local Pi settings merge validity;
- sandbox backend status;
- no-global-write evidence;
- checklist of blocked features.

It should support `--json` and stable exit codes. It should use temp dirs by default and require explicit flags for any project-local real verification.

## CI posture

Keep existing lint/format/typecheck/test configs protected. Adapt CI only after Olympus commands exist. Early CI should preserve:

- Bun install with lockfile;
- TypeScript check;
- Biome check;
- targeted tests for `packages/olympus`;
- acceptance simulation once implemented.

## Documentation verification

When implementation begins, documentation must not claim behavior that tests do not prove. In particular:

- do not claim safe executable third-party package execution before sandbox gates pass;
- do not claim global install support before high-risk global manifest/uninstall exists;
- do not claim OAL compatibility;
- do not present provider renderers as Olympus product scope.
