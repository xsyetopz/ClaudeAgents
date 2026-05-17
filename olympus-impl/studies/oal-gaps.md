# Phase 00 Study — OAL Gaps and Failure Modes

## Product-direction gaps for Olympus

1. **OAL is not Pi-first**
   - OAL's center of gravity is Codex, Claude Code, and OpenCode provider rendering.
   - Olympus must be PiCodingAgent-first, so the active product boundary cannot be inherited directly.

2. **OAL naming is pervasive**
   - Package names, commands, manifests, docs, specs, source product identity, plugin metadata, hooks, and generated paths all use OpenAgentLayer/OAL.
   - Olympus cannot be a cosmetic rename; phase-01 must define new product contracts and phase-02+ must re-author boundaries.

3. **Three-provider breadth creates complexity**
   - OAL's broad provider surface is strong for OAL but too wide to copy before Olympus defines its Pi harness.
   - A Pi-first harness should start with Pi extension/package behavior and add other provider surfaces only if justified.

4. **Existing Olympus package placeholder is empty**
   - `packages/olympus/src` and `packages/olympus/__tests__` exist as empty directories with no package metadata.
   - They should remain protected until phase-01 defines actual package ownership.

## Architectural gaps or risks in OAL

1. **Deploy merge semantics are intentionally narrow**
   - JSON/JSONC config merge is generic deep merge, but TOML preservation is specialized to `user_owned` lines.
   - This works for current fixtures but should not be treated as a universal config ownership model.

2. **Manifest version is static**
   - `createManifest` currently records `oalVersion: "0.0.0"` despite product version being `0.9.0-beta.1`.
   - Acceptance may tolerate this, but Olympus should define manifest versioning deliberately.

3. **Submodules are required but absent until initialized**
   - `third_party/*` directories existed but were uninitialized in this local inspection (`git submodule status` showed leading `-`).
   - OAL CI initializes them. Olympus design must decide whether package evaluation can require network/submodule hydration.

4. **Provider behavior relies on fast-moving external schemas**
   - Codex, Claude Code, OpenCode, officialskills, RTK, and Homebrew surfaces can change.
   - OAL mitigates with specs/tests but Olympus should minimize external moving parts during early implementation.

5. **Runtime hook surface is large**
   - 24 hook records and 38 runtime files create significant maintenance surface.
   - Olympus should re-author only hooks that map to Pi's actual lifecycle and conflict model.

6. **CLI surface is broad**
   - OAL CLI includes setup, deploy, plugins, profiles, state, codex, codex-usage, features, toolchain, MCP, RTK, provider-e2e, and more.
   - Olympus should define low-level CLI boundaries before reintroducing high-level wrappers.

7. **Generated-edit protection is provider-dependent**
   - Some protections rely on provider hook support and generated runtime scripts.
   - Olympus needs Pi-native verification and manifest checks rather than assuming provider hooks can enforce everything.

8. **Specs and docs describe OAL current behavior**
   - They are valuable evidence but active product docs must eventually present Olympus, not OAL.
   - Deleting or rewriting them too early would lose architecture knowledge.

9. **External research references are mixed with product release context**
   - `docs/codex-reddit-research.md` is useful but specific to Codex/OAL release decisions.
   - Olympus should retain it as evidence only if it informs a Pi design decision.

10. **Install scripts mutate persistent user locations**
    - `install-online.sh`, `install.sh`, `oal setup`, `oal plugins`, and `oal bin` can write to home/provider paths.
    - Olympus acceptance must isolate install smoke tests and keep destructive paths gated by dry-run/manifest ownership.

## Failure modes to avoid in Olympus

- Copying OAL package names and behavior into Olympus without a Pi-owned contract.
- Deleting OAL source/spec/test/config material before `oal_legacy/` exists and replacements are documented.
- Treating generated provider artifacts as source truth.
- Installing third-party Pi packages blindly without conflict evaluation.
- Building a large interactive CLI before low-level package boundaries are executable.
- Depending on external provider CLIs for core acceptance where a fixture can prove behavior deterministically.
- Retaining OAL compatibility/migration framing in active Olympus docs.
- Reusing OAL's route/agent catalog wholesale instead of re-authoring the subset that helps Pi extension authoring/evaluation.

## Items requiring protection until replacement exists

- `source/` catalog and prompt/resource model
- `packages/source`, `packages/adapter`, `packages/artifact`, `packages/deploy`, `packages/manifest`, `packages/runtime`, `packages/accept`, `packages/cli`, `packages/plugins`, `packages/inspect`, `packages/setup`, `packages/toolchain`, `packages/policy`
- `specs/` architecture and acceptance specs
- tests and CI workflow
- lint/format/typecheck/package manager configs
- install/uninstall/plugin scripts and Homebrew metadata
- `third_party/` submodule declarations and patches
- `scripts/create-oal-legacy-snapshot.sh`

These should not be deleted during phase-01. Destructive cleanup remains gated until phase-00, phase-01, and phase-02 are complete, `oal_legacy/` exists, paths are classified, and replacements/reasons are documented.
