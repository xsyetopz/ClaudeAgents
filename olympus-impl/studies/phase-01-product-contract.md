# Phase 01 — Olympus Pi-First Product Contract

## 1. Bottom line

**Decision:** Olympus is a Pi-first framework, not OAL with Pi added, not a Codex/Claude/OpenCode renderer, and not an OAL compatibility bridge.

**Decision:** Initial Olympus product scope is:

- package/resource evaluation for Pi packages;
- native Pi skills, prompts, extensions, tools, and extension events;
- OS-centric sandboxing and project-local safety by default;
- lockfile/provenance/ownership controls;
- a future seam toward a Go Pi-like harness.

**Fact:** Phase 00 found OAL was a provider-rendering compiler for Codex, Claude Code, and OpenCode. Phase 00.5 found Pi already has native packages/resources/extensions/hooks. Phase 00.6 found Pi package safety requires trust, lock/provenance, OS sandboxing, and host brokers.

## 2. Product boundary

**Decision:** Olympus initial shape is **both**:

1. **Standalone CLI**: evaluates, locks, sandboxes, installs, uninstalls, and audits Pi packages/resources.
2. **Pi package**: exposes native Pi skills/prompts/extensions for in-Pi workflows and safety/status commands.

**Inference:** The standalone CLI owns OS sandbox launch, lockfile enforcement, install/uninstall, and broker boundaries because these must sit outside Pi when untrusted Pi extension code might run. The Pi package owns Pi-native UX: commands, prompts, skills, hook-based policy support, and reporting inside Pi.

**Decision:** The standalone CLI is the release-critical safety boundary. The Pi package is useful but cannot be the only safety layer.

## 3. Supported platforms

| Platform | Contract |
| --- | --- |
| Linux native | Primary target. Strong sandbox support required for untrusted executable resources. |
| WSL2 Linux | Supported as Linux target if rootless Linux sandbox backend works inside WSL2. |
| macOS | Supported for inspect-only, passive install, project-local workflows, and trusted development. Third-party executable evaluation is degraded/blocked until credible containment is proven. |
| Windows native | Unsupported, except via WSL2. |

**Unknown:** macOS executable-resource containment needs a proven backend before Olympus can claim strong safety there.

## 4. Explicitly removed OAL/provider scope

**Decision:** Removed from active product scope:

- Codex provider rendering;
- Claude Code provider rendering;
- OpenCode provider rendering;
- OAL compatibility as a product feature;
- OAL plugin payload sync;
- OAL Homebrew/provider release machinery unless re-justified for Pi.

OAL component classification:

| OAL component/pattern | Olympus status |
| --- | --- |
| Source graph | Re-authorable pattern, not copied architecture. Useful for resource inventory/provenance. |
| Provider adapters | Evidence/reference only. No active renderer goal. |
| Deploy plan/apply | Re-authorable only for Pi/local generated files and project-local install. |
| Manifest ownership | Active Olympus concept. Required for generated files/uninstall. |
| Acceptance simulation | Active Olympus concept. Must prove package/resource/sandbox safety. |
| Runtime hooks | Re-author as Pi extension events. |
| Skills | Re-author as native Pi skills. |
| Routes/commands | Re-author as Pi prompt templates and extension commands. |
| Plugin payload sync | Evidence/reference only. |
| Existing OAL product files | Delete/move later only after replacement and legacy snapshot rules are satisfied. |

## 5. Initial Pi artifact model

**Decision:** Minimum Olympus artifact is a project-local Pi package workspace plus safety metadata:

```text
<package>/
  package.json          # Pi package manifest with pi.extensions/skills/prompts/themes
  skills/               # native Pi skills
  prompts/              # native Pi prompt templates
  extensions/           # Pi extension modules, if trusted/executable
  olympus.lock          # resolved content/capability/sandbox trust records
  olympus-manifest.json # generated artifact ownership/hash/rollback metadata
  sandbox.json          # declared sandbox profiles/capability requests
```

**Decision:** Project-local install is the default target. Global install is blocked by default or high-risk explicit.

**Fact:** Pi package docs support package resources for extensions, skills, prompts, and themes and project-local package installation via `.pi/settings.json`.

## 6. Passive vs executable resource policy

| Resource/source | Policy |
| --- | --- |
| Skills/prompts/themes | Passive-but-untrusted. May install project-locally without executable trust, but must show prompt-injection signage. |
| Extensions/tools/providers/hooks | Executable. Require explicit trust, lock match, approved capabilities, and sandbox profile before execution. |
| Mixed packages | Split if possible. Passive resources may install without executing extensions; executable parts remain blocked until trusted. |
| Local path packages | Mutable/unverifiable by publisher; trust binds to current content digest and goes stale on change. |
| Git packages | Pin to commit/content digest; branches/tags alone are insufficient. |
| npm packages | Pin version/resolved tarball/integrity/content digest; signatures/provenance are labels, not safety grants. |
| Project-local install | Default. Must not touch global `~/.pi`. |
| Global install | Blocked by default; high-risk explicit mode only. |

## 7. Trust/lock/signage contract

**Decision:** Third-party executable resources require explicit trust.

**Decision:** Trust binds to all of:

- package identity/source;
- version/ref/resolved URL;
- content digest/integrity;
- publisher/signature/provenance status when available;
- resource inventory;
- executable entrypoints;
- requested and approved capabilities;
- sandbox profile;
- install scope.

**Decision:** Hash mismatch blocks load/install for executable resources and requires re-review. Passive resources with hash mismatch require re-confirmation.

**Decision:** Signing/provenance proves identity/integrity/build context, not safety. A signed package requesting dangerous capabilities remains dangerous.

Required signage labels:

- `UNSIGNED`, `SIGNED`, `VERIFIED PUBLISHER`;
- `LOCKED`, `HASH MISMATCH`;
- `TRUSTED PASSIVE`, `TRUSTED EXECUTABLE`, `REVOKED`;
- `SANDBOXED`, `NETWORK ALLOWED/DENIED`, `HOME ALLOWED/DENIED`;
- `PROJECT WRITE`, `GLOBAL WRITE`.

**Fact:** Phase 00.6 compared Bun `trustedDependencies`, npm lock/integrity/provenance, pnpm build-script approvals, Cargo.lock/cargo-vet, and Sigstore. Olympus adopts default-deny trust but must go broader because Pi package code can execute at runtime.

## 8. Sandbox baseline for Linux, WSL2, and macOS

**Decision:** `skip-permissions` must never disable OS containment. It can only suppress confirmations for operations already allowed by the active sandbox profile.

**Decision:** `unsafe-host` is outside Olympus safety guarantees.

| Platform | Baseline |
| --- | --- |
| Linux native | First strong target: rootless `bubblewrap` or equivalent Linux namespace sandbox if available. Deny home by default, deny network by default, mount project read-only, writable output root only. |
| WSL2 | Same as Linux, contingent on sandbox backend support in WSL2. If unavailable, untrusted executable evaluation is blocked/degraded. |
| macOS | Inspect-only/passive/trusted-dev allowed. Untrusted executable evaluation blocked or degraded until a credible backend is selected. `sandbox-exec` is deprecated; temp-home/env isolation alone is not strong containment. |

Initial sandbox profiles:

- `inspect-only`: no execution, no writes;
- `passive-resource-install`: skills/prompts/themes only, project-local metadata writes after dry-run;
- `package-eval-offline`: temp root, no network, no credentials;
- `project-read-output-write`: project read-only, declared output writable;
- `brokered-host-tools`: no home access, selected brokers only;
- `trusted-dev`: explicit developer mode;
- `unsafe-host`: unrestricted, outside guarantees.

## 9. Host broker baseline

**Decision:** Phase 02 should include a **read-only `gh` broker first** if any broker is included. Git and registry metadata brokers are next candidates.

Broker rules:

- no arbitrary shell strings;
- no raw credential files exposed to sandbox;
- typed operations only;
- validate command, subcommand, args, cwd, host, and repo;
- redact output;
- audit every call;
- mutation requires explicit confirmation and is out of first broker scope unless approved.

**Inference:** A read-only `gh` broker proves the core pattern: sandboxed code can request authenticated context without seeing `~/.config/gh`, tokens, or host home.

## 10. Ownership/uninstall model

**Decision:** Olympus needs its own manifest for generated artifacts and install ownership.

Ownership metadata must record:

- canonical path;
- artifact type/scope;
- content hash;
- source package/resource id;
- install scope;
- sandbox/trust record reference;
- backup/rollback path if any.

Uninstall rules:

- dry-run first;
- delete only manifest-owned files with hash match;
- preserve user-modified generated files;
- never infer ownership from filename alone;
- project-local uninstall must not touch global `~/.pi`;
- global uninstall requires explicit high-risk scope.

## 11. Acceptance contract

Release-blocking fixtures:

- Pi package/resource discovery;
- passive skill install without executable trust;
- prompt template install and argument behavior;
- extension blocked without trust;
- lockfile hash mismatch blocks load/install;
- signed package does not bypass sandbox;
- Linux/WSL2 sandbox cannot read `~/.ssh`;
- Linux/WSL2 sandbox cannot read `~/.config/gh`;
- Linux/WSL2 sandbox cannot read `~/.pi/agent/auth.json`;
- sandbox cannot write outside output root;
- `skip-permissions` cannot escape sandbox;
- project install does not touch global `~/.pi`;
- untrust/revoke blocks future execution;
- broker denies arbitrary shell strings, if broker is in scope;
- broker allows approved read-only operation, if broker is in scope.

**Inference:** Acceptance fixtures should use temp homes, temp projects, temp Pi settings/sessions, and OS sandbox probes rather than real user state.

## 12. Long-term Go harness seam

**Decision:** Long-term architecture should allow a custom Go Pi-like harness to replace Node/Pi runtime pieces later, but Phase 02 must not implement the Go harness unless explicitly approved.

Pi concepts Olympus should depend on now:

- package resources: skills, prompts, extensions, themes;
- extension event concepts: tool call/result, provider request filtering, command registration;
- project-local settings/resources;
- session/resource discovery concepts where needed.

Interfaces to abstract now:

- package/resource inventory;
- trust/lock verification;
- sandbox launch;
- host broker RPC;
- generated artifact ownership;
- prompt/skill/resource acceptance fixtures;
- tool/policy decisions.

Do not overfit to:

- Pi internal file paths beyond documented resource locations;
- Pi extension runner ordering as a sole safety boundary;
- Node-specific module loading details;
- current package-manager implementation internals.

Harness-neutral acceptance should cover resource inventory, trust decisions, sandbox denial, broker policy, lock mismatch, and ownership/uninstall behavior. Pi-specific acceptance should cover Pi package manifests, Pi prompt args, Pi skill discovery, and Pi extension registration behavior.

## 13. Explicit non-goals

- OAL compatibility bridge;
- Codex/Claude/OpenCode provider rendering;
- global install by default;
- Windows native support outside WSL2;
- perfect OS sandbox claims on macOS before proof;
- unsafe-host safety guarantees;
- Go harness implementation in Phase 02 without explicit approval;
- relying on signatures as proof of safety;
- relying only on Pi hooks for containment.

## 14. Phase 02 prerequisites

Before implementation, Phase 02 must have:

1. finalized CLI/Pi-package split and command names;
2. selected Linux/WSL2 sandbox backend and detection behavior;
3. macOS degraded/blocked behavior text;
4. `olympus.lock` minimal schema;
5. ownership manifest minimal schema;
6. passive/executable resource classifier;
7. project-local install dry-run/apply plan;
8. untrust/revoke plan;
9. read-only `gh` broker scope decision;
10. acceptance fixture skeleton plan using temp roots only.

## Source/evidence list

- Phase 00 architecture study: `olympus-impl/studies/oal-architecture.md`
- Phase 00 pipeline study: `olympus-impl/studies/oal-pipeline.md`
- Phase 00.5 Pi surface study: in-chat Phase 00.5 report; Pi docs `https://pi.dev/docs/latest`
- Phase 00.6 trust/lock study: `olympus-impl/studies/phase-00.6-sandbox-trust-lock.md`
- Phase 00.6 OS sandbox study: `olympus-impl/studies/phase-00.6-os-sandbox-options.md`
- Phase 00.6 host broker study: `olympus-impl/studies/phase-00.6-host-brokers.md`
- Phase 01.5 safety contract: in-chat Phase 01.5 report
