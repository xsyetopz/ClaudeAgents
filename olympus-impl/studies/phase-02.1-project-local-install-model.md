# Phase 02.1 — Project-Local Pi Install Model

## 1. Bottom line

**Decision:** Use model **C: create an Olympus-owned local package mirror and reference that mirror from project `.pi/settings.json`**.

For a local path Pi package, Olympus should not reference the original package path directly and should not write directly into `.pi/skills` or `.pi/prompts`. Instead, it should copy only approved passive resources into an Olympus-owned sanitized mirror under `.pi/olympus/packages/<id>/package/`, then add a filtered package entry to `.pi/settings.json`.

**Reason:** This gives Pi-native resource discovery while preserving Olympus ownership, hash checking, uninstall safety, and future trust/sandbox compatibility.

## 2. Facts from sources

- **Fact:** Pi packages can declare resources in `package.json` under `pi`, or use conventional `extensions/`, `skills/`, `prompts/`, and `themes/` directories. Source: Pi docs `packages.md`, `https://pi.dev/docs/latest/packages`.
- **Fact:** Pi local path packages are added to settings without copying; relative local paths in `.pi/settings.json` resolve relative to `.pi`. Source: Pi docs `packages.md`.
- **Fact:** Project-local package install writes project `.pi/settings.json`; default install/remove writes global settings. Source: Pi docs `packages.md`.
- **Fact:** Pi package settings support object filters: `source`, `extensions`, `skills`, `prompts`, `themes`; `[]` loads none of that type, omitted keys load all of that type, and exact `+path`/`-path` filters are supported. Source: Pi docs `packages.md`, `settings.md`.
- **Fact:** Pi packages/extensions run with full system access, and skills can instruct the model to run actions. Source: Pi docs `packages.md`, Phase 00.5/00.6 notes.

## 3. Model comparison

| Model | Result |
| --- | --- |
| A. Copy passive resources into `.pi/olympus/packages/<id>/...` | Good ownership, but should still expose them to Pi as a package mirror. |
| B. Reference original local package path | Rejected. Original path can change after trust/lock, includes executable resources/scripts, and is not Olympus-owned. |
| C. Olympus-owned local package mirror + settings reference | **Chosen.** Best fit for Pi discovery, ownership, hashes, uninstall, and future safety. |
| D. Write directly into `.pi/skills` and `.pi/prompts` | Rejected. Easier to clobber user resources and harder to group/uninstall by package. |
| E. Other | Not needed for Phase 02. |

## 4. Exact Phase 02 writes

**Decision:** Phase 02 may write only project-local Olympus-owned files:

```text
.pi/settings.json
.pi/olympus/olympus.lock
.pi/olympus/olympus-manifest.json
.pi/olympus/audit.jsonl
.pi/olympus/packages/<package-id>/package/package.json
.pi/olympus/packages/<package-id>/package/skills/**
.pi/olympus/packages/<package-id>/package/prompts/**
.pi/olympus/packages/<package-id>/package/themes/**
```

**Decision:** Do not write:

- `~/.pi/**`;
- `.pi/skills/**`;
- `.pi/prompts/**`;
- `.pi/extensions/**`;
- user source files;
- executable extension files into the mirror in Phase 02.

### `.pi/settings.json` key

Only the top-level `packages` array may be modified.

Olympus adds one filtered local package entry per installed mirror:

```json
{
  "source": "./olympus/packages/<package-id>/package",
  "extensions": [],
  "skills": ["+skills/foo/SKILL.md"],
  "prompts": ["+prompts/review.md"],
  "themes": ["+themes/dark.json"]
}
```

If a resource type has no installed resources, use `[]` for clarity. Always set `extensions: []` in Phase 02.

**Inference:** The mirror package `package.json` should also declare only passive resources in its `pi` manifest, so settings filters and mirror contents both deny executable loading.

## 5. Merge/unmerge behavior for `.pi/settings.json`

**Decision:** Settings merge must be surgical and manifest-backed.

Install merge:

1. Read existing `.pi/settings.json` if present; preserve formatting best-effort but semantic preservation is required.
2. Preserve all non-`packages` keys unchanged.
3. Preserve all non-Olympus `packages` entries unchanged.
4. Add/update only entries whose `source` equals an Olympus mirror path recorded in `olympus-manifest.json`.
5. Never remove or rewrite user package entries for the original source package.
6. If `packages` is absent, create it as an array.
7. If `packages` exists but is not an array, block and report user-owned incompatible settings.

Uninstall unmerge:

1. Load `olympus-manifest.json`.
2. Remove only package entries whose `source` exactly matches the manifest-owned Olympus mirror path.
3. Delete mirror files only when manifest hash matches current file hash.
4. Preserve user-modified files and report them.
5. Preserve empty parent directories unless manifest proves Olympus created them and they are empty.
6. Never remove user package entries, even if they point to the original local path.

Hash mismatch/user edits:

- Mirror file hash mismatch: preserve file, mark uninstall partial, report manual cleanup path.
- `olympus.lock` content digest mismatch for source package: block install/update until re-lock/re-review.
- `.pi/settings.json` Olympus entry modified by user: do not overwrite silently; show diff and require explicit repair/update.

## 6. Final Phase 02 install layout

Example final layout:

```text
.pi/
  settings.json
  olympus/
    olympus.lock
    olympus-manifest.json
    audit.jsonl
    packages/
      local-my-package-<digest>/
        package/
          package.json          # sanitized Pi package manifest
          skills/
            foo/
              SKILL.md
              references/...
          prompts/
            review.md
          themes/
            dark.json
```

Sanitized mirror `package.json`:

```json
{
  "name": "olympus-mirror-local-my-package",
  "version": "0.0.0",
  "private": true,
  "pi": {
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"],
    "extensions": []
  }
}
```

**Decision:** The mirror is the install unit. The original source package is the inspected/locked source of truth, but Pi loads only the sanitized mirror.

## 7. Risks and unknowns

- **Risk:** Pi may accept package filter paths differently across versions; acceptance must verify exact `+path` behavior for skills/prompts/themes.
- **Risk:** Skill support files are not independently listed as Pi resources; Olympus must copy and hash support files referenced/contained under each installed skill directory.
- **Risk:** Reformatting `.pi/settings.json` can annoy users; implementation should preserve JSON content and minimize diffs where practical.
- **Unknown:** Whether Pi ignores unknown fields in package objects safely; Phase 02 should avoid custom fields in `.pi/settings.json` and keep Olympus metadata in `olympus-manifest.json`.

## 8. Phase 02 action items

1. Implement local package inspection without execution.
2. Build sanitized passive-resource mirror writer.
3. Add filtered local package entry merger for `.pi/settings.json`.
4. Add manifest hashes for settings entry and mirror files.
5. Add uninstall unmerge/delete with hash checks.
6. Add acceptance for project-local install not touching `~/.pi`.

## 9. Source list

- Pi packages documentation: `https://pi.dev/docs/latest/packages`; local mirror `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`
- Pi settings documentation: `https://pi.dev/docs/latest/settings`; local mirror `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/settings.md`
- Pi package manager type surface: `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/dist/core/package-manager.d.ts`
- Phase 02 implementation plan: `olympus-impl/studies/phase-02-implementation-plan.md`
