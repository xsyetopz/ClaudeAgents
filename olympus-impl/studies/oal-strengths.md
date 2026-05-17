# Phase 00 Study — OAL Strengths

## Strong patterns to retain by re-authoring

1. **Compiler mental model**
   - OAL separates authored intent (`source/`) from rendered artifacts, installation ownership, and acceptance evidence.
   - This gives the product a clear pipeline instead of ad-hoc file copying.

2. **Provider-native output**
   - OAL does not force one generic shape onto Codex, Claude Code, and OpenCode.
   - Each provider renderer owns its native config, agent, command, hook, tool, and plugin shapes.

3. **Manifest-backed uninstall**
   - Deploy records ownership before uninstall ever mutates files.
   - Uninstall removes only manifest-owned files, blocks, or config keys, preserving user-owned content.

4. **Dry-run and plan/apply split**
   - Deploy and setup can explain intended mutations before applying them.
   - This is essential for any product that writes into user repositories or provider homes.

5. **Substantial acceptance simulation**
   - Acceptance creates fixture roots, deploys artifacts, checks configs, runs hooks/tools, detects drift, uninstalls, and verifies user content remains.
   - This is stronger than isolated unit tests for an agent-environment product.

6. **Executable hooks with fixtures**
   - Hooks are real runtime scripts with pass/warn/block decisions and provider-shaped output.
   - Source records, renderer paths, and runtime scripts are connected by tests/acceptance.

7. **Source provenance and artifact metadata**
   - Artifacts carry `sourceId`; generated files get provenance comments where possible.
   - This helps explain outputs and detect accidental edits.

8. **Source catalog with operational depth**
   - Agents, skills, routes, hooks, tools, prompt templates, and support files form a rich operational graph.
   - The catalog is more maintainable than one large hand-written provider config.

9. **Provider capability reports**
   - Unsupported capability records make provider limits explicit instead of silent.

10. **Shared inspection surface**
    - CLI inspect, MCP inspect, and OpenCode tools are designed to use shared behavior.
    - This reduces drift between human-facing and provider-facing diagnostics.

11. **Durable profile/state idea**
    - Setup profiles and state inspection make repeated installation workflows reproducible.

12. **Release metadata discipline**
    - Version bump tooling and acceptance link package version, product source version, plugin metadata, changelog, and Homebrew cask metadata.

13. **CI as product proof**
    - CI runs submodule verification, typecheck, tests, acceptance, lint, RTK gain, roadmap evidence, and dry-run smoke.

14. **Third-party reference discipline**
    - External repos are kept as submodules and integrated through explicit source records or scripts rather than hidden vendoring.

15. **Prompt/resource progressive disclosure**
    - Skills can include support files, scripts, references, and assets, keeping entrypoint prompts smaller and resources discoverable.

## Strong patterns specifically useful for Olympus

- Pi-first Olympus should keep a source/compile/evaluate/deploy/acceptance loop, even if the source graph is much smaller than OAL's.
- Manifest-backed ownership should be retained for any Olympus file writes into project roots, Pi config roots, or generated extension directories.
- A bounded setup/deploy dry-run should remain the default safe first path.
- Acceptance should simulate real Pi extension installation, package evaluation, conflict detection, uninstall, and generated scaffold checks.
- Physical handoff/state files under `olympus-impl/` are aligned with OAL's continuity/state discipline and should remain until Olympus has its own durable state model.
- OAL's route/skill/agent catalog proves that authored operational records can generate rich provider behavior; Olympus can re-author the useful idea for PiCodingAgent extensions instead of cloning the catalog.
