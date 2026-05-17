# Phase 00.6 Study — Sandbox, Trust, and Lockfile

## 1. Bottom line

**Decision:** Olympus should split safety into three independent gates:

1. **Trust/signage:** decides whether a package/resource may be loaded or executed.
2. **Lockfile/provenance:** records exact resolved content, reviewed capabilities, and approved sandbox profile.
3. **OS sandbox/runtime policy:** limits what code can touch after it is allowed to run.

**Decision:** `trusted`, `signed`, `verified`, and `locked` are not synonyms for `safe`. A signature or provenance statement proves identity/integrity/build context; it does not prove benign runtime behavior.

**Decision:** Third-party Pi resources should install project-locally by default. Global install should be blocked by default or gated behind an explicit high-risk workflow.

**Inference:** Olympus should treat passive resources and executable resources differently:

- passive-but-untrusted: skills, prompt templates, themes;
- executable: extensions, tools, custom providers, lifecycle scripts, package scripts, hook code.

Passive resources can be installed without allowing arbitrary code execution, but they remain prompt-injection surfaces and should be labeled accordingly.

## 2. Facts from sources

### Pi package/resource facts

- **Fact:** Pi packages can declare `extensions`, `skills`, `prompts`, and `themes` under a `pi` key in `package.json`, or expose conventional resource directories. Source: `https://pi.dev/docs/latest/packages`; local mirror `@earendil-works/pi-coding-agent/docs/packages.md`.
- **Fact:** Pi package sources include npm, git, GitHub URLs, and local paths; project-local install writes project `.pi/settings.json`; global install writes global Pi settings. Source: `https://pi.dev/docs/latest/packages`.
- **Fact:** Pi package and extension documentation warns that packages/extensions run with full system access. Source: `https://pi.dev/docs/latest/packages`, `https://pi.dev/docs/latest/extensions`.
- **Fact:** Pi skills are instructions and support files loaded by the model; skills become `/skill:name` commands. Source: `https://pi.dev/docs/latest/skills`.
- **Fact:** Pi prompt templates are Markdown files whose filenames become slash commands. Source: `https://pi.dev/docs/latest/prompt-templates`.
- **Fact:** Pi extension hooks can intercept/mutate tool calls, tool results, provider requests, inputs, resources, and agent/session lifecycle events. Source: `https://pi.dev/docs/latest/extensions`; local mirror `dist/core/extensions/types.d.ts`, `dist/core/extensions/runner.js`.

### Package-manager trust/provenance models

- **Fact:** Bun does not execute arbitrary dependency lifecycle scripts by default and uses `trustedDependencies`; `bun pm trust <names>` runs scripts for untrusted dependencies and adds them to `trustedDependencies`. Source: `https://bun.sh/docs/pm/lifecycle`, `https://bun.sh/docs/pm/cli/pm`.
- **Fact:** npm `package-lock.json` records package `version`, `resolved` source, and `integrity` using Subresource Integrity strings; git dependencies include commit sha in the resolved URL. Source: `https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json`.
- **Fact:** npm registry ECDSA signatures sign package name, version, and tarball integrity: `${package.name}@${package.version}:${package.dist.integrity}`. Source: `https://docs.npmjs.com/about-registry-signatures`.
- **Fact:** npm provenance uses OIDC/build-system information, certificates, and a transparency log to attest build/publish context. Source: `https://docs.npmjs.com/generating-provenance-statements`.
- **Fact:** pnpm supports build-script approval workflows such as `pnpm approve-builds`, and settings such as `onlyBuiltDependencies`/trust-related policies. Source: `https://pnpm.io/cli/approve-builds`, `https://pnpm.io/settings#onlybuiltdependencies`.
- **Fact:** Cargo distinguishes broad dependency requirements in `Cargo.toml` from exact resolved versions in `Cargo.lock` to support reproducible builds. Source: `https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html`.
- **Fact:** cargo-vet records audits/trust entries and policy for third-party Rust dependencies. Source: `https://mozilla.github.io/cargo-vet/`.
- **Fact:** Sigstore signs artifacts and records signing events in a transparency log; verification establishes expected identity/source and tamper evidence. Source: `https://docs.sigstore.dev/`.

## 3. Olympus design inferences

### Safe third-party installation flow

**Inference:** Olympus should provide an install flow that separates discovery from execution:

1. Resolve package/resource metadata.
2. Inspect manifest and resource inventory without executing package code.
3. Classify resources as passive or executable.
4. Compute content digest and compare with `olympus.lock`.
5. Present signage and requested capabilities.
6. Require explicit trust for executable resources.
7. Install project-locally by default.
8. Execute only under an approved sandbox profile.

**Decision:** Default scopes:

- third-party skills/prompts/themes: project-local, passive-resource-install profile;
- third-party extensions/tools/providers/hooks: project-local only after explicit trust and lock entry;
- global install: blocked by default; explicit high-risk prompt plus lock entry required;
- local path packages: always marked mutable/unverifiable unless content digest is pinned at time of trust.

### Passive versus executable resources

**Decision:** Olympus should represent resources as:

```text
passive_resource:
  - skill
  - prompt
  - theme
  - static docs/assets

executable_resource:
  - extension module
  - tool implementation
  - provider implementation
  - hook/interceptor
  - package lifecycle script
  - install/build/postinstall/preinstall script
  - generated shell script intended to run
```

**Inference:** Passive resources do not require code-execution trust, but they require prompt-injection signage. A malicious skill can still instruct an agent to leak secrets or run destructive commands.

### What requires explicit trust

**Decision:** Explicit trust is required for:

- running any extension factory/module;
- registering or overriding a tool;
- registering a custom provider;
- using Pi hooks that can mutate/block tool calls/provider payloads;
- running lifecycle scripts or package scripts;
- granting network;
- granting host broker access;
- granting project writes;
- touching global Pi state;
- using `unsafe-host` mode.

### `olympus.lock` study shape

**Inference:** A project-local `olympus.lock` should exist for project installs/evaluations. A separate global trust database may exist for user-wide decisions, but project lock entries must be sufficient to reproduce and audit project behavior.

Study-level shape:

```yaml
lockfileVersion: 1
projectRoot: /canonical/project/root
entries:
  - id: npm:@scope/pkg@1.2.3
    package:
      name: '@scope/pkg'
      sourceType: npm            # npm | git | local | catalog | tarball
      source: npm:@scope/pkg@1.2.3
      resolvedVersion: 1.2.3
      resolvedRef: null
      resolvedUrl: https://registry.npmjs.org/...
      contentDigest: sha256:...
      npmIntegrity: sha512-...
      signature:
        status: unsigned          # unsigned | signed | verified-publisher | failed | unknown
        scheme: npm-ecdsa | sigstore | provenance | none
        identity: publisher/build identity if verified
      provenance:
        status: present | absent | failed | unknown
        builder: github-actions | other | unknown
    resources:
      extensions:
        - path: extensions/index.ts
          executable: true
          entrypoint: true
      skills:
        - path: skills/foo/SKILL.md
          passive: true
      prompts:
        - path: prompts/review.md
          passive: true
      themes: []
    scripts:
      lifecycle:
        preinstall: present | absent
        install: present | absent
        postinstall: present | absent
      packageScripts:
        build: present | absent
    capabilities:
      requested:
        - network
        - tool.register
        - hook.tool_call
      approved:
        - hook.tool_call
      denied:
        - network
    sandbox:
      profile: package-eval-offline
      network: denied
      homeAccess: denied
      project: read-only
      outputRoots:
        - .olympus/generated/pkg
    install:
      scope: project             # temp | project | global
      installedPaths:
        - .pi/settings.json key/pi.packages[...]
      ownershipRefs:
        - manifest-entry-id
    trust:
      decision: trusted-executable | trusted-passive | untrusted | revoked
      trustedBy: local-user
      trustedAt: '2026-05-17T...Z'
      reason: human-readable note
      expiresAt: null
    review:
      reviewedCapabilitiesHash: sha256:...
      reviewedBy: local-user | policy
      reviewedAt: '...'
```

### What trust binds to

**Decision:** Trust must bind to all of the following:

- package identity/name;
- source type and source location;
- resolved version/ref;
- content digest;
- publisher/signing/provenance status when available;
- resource inventory;
- executable entrypoints;
- requested/approved capabilities;
- sandbox profile;
- install scope.

**Decision:** Name-only or publisher-only trust is insufficient. Version-only trust is insufficient. Signature-only trust is insufficient. Capability approval without a content digest is insufficient.

### Hash mismatch behavior

**Decision:** If content digest changes:

- block executable load;
- block install/update unless user re-reviews;
- mark passive resources stale and require at least re-confirmation;
- preserve current installed state until user chooses update/remove;
- show old digest, new digest, source, and changed resource inventory if available.

### Signed but dangerous packages

**Decision:** A signed package requesting dangerous capabilities is still dangerous. Signature/provenance can reduce identity/tamper uncertainty but cannot grant capabilities. Capability approval and sandbox containment remain mandatory.

### Untrust/revoke

**Decision:** Untrust/revoke means:

- mark lock/trust entry `revoked`;
- prevent future extension execution;
- disable package resources from new sessions where possible;
- optionally remove project-local package references in dry-run/apply flow;
- preserve user files and generated files unless ownership/hash rules allow deletion;
- keep audit history.

### User-facing signage

**Decision:** Olympus should show separate badges:

- `UNSIGNED`: no verified package signature/provenance.
- `SIGNED`: signature verified for artifact identity/integrity only.
- `VERIFIED PUBLISHER`: publisher/build identity verified, not safety.
- `LOCKED`: content digest and resource inventory match `olympus.lock`.
- `HASH MISMATCH`: content differs from reviewed lock entry; block executable load.
- `TRUSTED PASSIVE`: user allowed passive resource loading only.
- `TRUSTED EXECUTABLE`: user allowed executable resource under named sandbox profile.
- `SANDBOXED`: OS containment profile active.
- `NETWORK ALLOWED`: sandbox/broker grants network.
- `HOME DENIED` / `HOME ALLOWED`: explicit home access label.
- `PROJECT READ` / `PROJECT WRITE`: project access label.
- `GLOBAL WRITE`: high-risk label for `~/.pi`/global state writes.

**Decision:** UI text must say: `Signed means verified origin/integrity; it does not mean safe.`

### Bun trust comparison

**Inference:** Bun's `trustedDependencies` is the closest conceptual precedent: scripts are blocked by default and explicit trust enables them. Olympus should adopt the default-deny trust posture but go broader because Pi packages can execute at runtime as extensions/hooks/tools, not only at install/build time.

## 4. Risks/limitations

- **Risk:** Passive skills/prompts can still manipulate the agent even without code execution.
- **Risk:** Registry signatures/provenance do not detect intentionally malicious publishers.
- **Risk:** Local path packages are mutable; trust must be content-digest based and may go stale quickly.
- **Risk:** Git branches/tags can move unless pinned to immutable commit digests and verified.
- **Risk:** Package metadata inspection may miss dynamically loaded executable code.
- **Risk:** Lockfile entries can become stale if package manager resolution changes.
- **Unknown:** Exact Pi package-manager lock/provenance artifacts beyond settings/sourceInfo need confirmation in Pi source before Olympus relies on them.
- **Unknown:** Whether Pi package gallery metadata exposes signatures/provenance directly.

## 5. Phase 01 / Phase 02 questions

1. Should `olympus.lock` live at repo root, under `.olympus/`, or under `olympus-impl/` during bootstrap only?
2. Should Olympus maintain a global trust database in `~/.olympus/trust.json`, or avoid global trust entirely in early phases?
3. What is the minimum viable signature/provenance verifier for npm packages in Phase 02?
4. Should local path packages require re-review every run unless content digest matches lock?
5. How should Olympus disable a revoked Pi package in `.pi/settings.json` without clobbering user settings?
6. Should passive prompt/skill install be allowed when executable resources are present in the same package but not trusted?
7. Should Olympus split package resources into separate installed subsets when possible?

## 6. Source list

- Pi packages: `https://pi.dev/docs/latest/packages`; local mirror `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`
- Pi extensions: `https://pi.dev/docs/latest/extensions`; local mirror `docs/extensions.md`, `dist/core/extensions/types.d.ts`, `dist/core/extensions/runner.js`
- Pi skills: `https://pi.dev/docs/latest/skills`
- Pi prompt templates: `https://pi.dev/docs/latest/prompt-templates`
- Pi repository: `https://github.com/earendil-works/pi`
- Bun lifecycle/trust: `https://bun.sh/docs/pm/lifecycle`, `https://bun.sh/docs/pm/cli/pm`
- npm lockfile: `https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json`
- npm provenance: `https://docs.npmjs.com/generating-provenance-statements`
- npm registry signatures: `https://docs.npmjs.com/about-registry-signatures`
- pnpm approve builds: `https://pnpm.io/cli/approve-builds`
- pnpm settings/trust/build controls: `https://pnpm.io/settings#onlybuiltdependencies`
- Cargo lockfile: `https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html`
- cargo-vet: `https://mozilla.github.io/cargo-vet/`
- Sigstore overview: `https://docs.sigstore.dev/`
