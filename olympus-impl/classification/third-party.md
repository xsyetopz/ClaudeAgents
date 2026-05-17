# Phase 00 Classification — Third Party Material

## Summary

`third_party/` contains Git submodule declarations. During phase-00 local inspection, the directories existed but submodules were not initialized; `git submodule status --recursive` showed leading `-` for each entry. CI initializes and verifies these submodules before quality checks.

## Submodules

| Path | URL | Branch | Observed commit | Classification | Rationale |
| --- | --- | --- | --- | --- | --- |
| `third_party/caveman` | `https://github.com/juliusbrussee/caveman.git` | `main` | `ef6050c5e1848b6880ff47c32ade1a608a64f85e` | UNKNOWN_PROTECT | External skill reference used by OAL's Caveman skill/prompt behavior; keep until Olympus decides output-compression policy |
| `third_party/taste-skill` | `https://github.com/Leonxlnx/taste-skill.git` | `main` | `60c2de19766019297287bd26a260275e499789a9` | UNKNOWN_PROTECT | External skill reference informing taste/design behavior; keep until Olympus decides whether to include/evaluate external Pi skills |
| `third_party/gitleaks` | `https://github.com/gitleaks/gitleaks.git` | `master` | `9febafb621f407ec7fd0d398783fa3a63418f694` | UNKNOWN_PROTECT | Upstream rules feed `scripts/sync-gitleaks-rules.mjs` and runtime secret guard behavior; keep until Olympus secret policy exists |
| `third_party/impeccable` | `https://github.com/pbakaus/impeccable.git` | `main` | `c32daaf3b03a4cf1448d18b5a03c5c07fc466fbb` | UNKNOWN_PROTECT | Upstream skill body is hydrated verbatim by `source/skills/impeccable.json`; keep as reference until Olympus package/skill evaluation policy exists |

## Related non-submodule third-party/evidence material

| Path | Classification | Rationale |
| --- | --- | --- |
| `.gitmodules` | ADAPT_FOR_OLYMPUS | Source of submodule truth; preserve |
| `upstream-sources.lock.json` | UNKNOWN_PROTECT | Upstream lock/evidence file; preserve until upstream ingestion policy is designed |
| `patches/gitleaks-toml.patch` | UNKNOWN_PROTECT | Patch applied to upstream Gitleaks config; part of generated secret-rule pipeline |
| `scripts/sync-gitleaks-rules.mjs` | ADAPT_FOR_OLYMPUS | Sync/generation pattern is useful if Olympus keeps secret scanning hooks |
| `source/skills/impeccable.json` | REAUTHOR_FOR_OLYMPUS | Demonstrates upstream skill hydration; should inform Olympus package evaluation rather than be copied blindly |
| `source/skill-resources/**` | REAUTHOR_FOR_OLYMPUS | Authored support resources may be useful as examples; Olympus resources should be Pi-owned |
| `docs/codex-reddit-research.md` | MOVE_TO_LEGACY_ONLY | External research disposition specific to Codex/OAL release choices; preserve as evidence, not active Olympus product behavior |

## Third-party policy conclusions for Olympus

- Do not delete `third_party/` before `oal_legacy/` exists and a replacement/source policy is documented.
- Do not initialize, update, vendor, or import new third-party material during phase-00.
- Phase-01 must define how Olympus evaluates Pi packages and third-party skills before phase-02+ implementation uses them.
- Phase-02 must ensure `oal_legacy/` excludes submodule worktrees or snapshots them deliberately according to the legacy snapshot script's rules.
- Olympus should prefer explicit package evaluation reports over blind third-party installation.

## Current phase-00 state

Classification is conservative because the local submodule contents were unavailable without initialization. This is not a blocker for phase-00 study because `.gitmodules`, CI verification steps, source references, and scripts show how OAL expects these dependencies to be used.
