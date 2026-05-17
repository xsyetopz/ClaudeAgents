# Olympus Implementation Authority

`olympus-impl/` is the authoritative temporary controller for building Olympus inside this repository.

## Product Direction

Olympus replaces OAL as the product in this repository.

This is not a migration path, compatibility layer, or OAL vNext. It is a PiCodingAgent-first greenfield product produced by studying the original OAL architecture and re-authoring the good parts.

## Required Order

1. **Phase 00:** create a formal study of OAL architecture and the entire pipeline.
2. **Phase 01:** design the PiCodingAgent-first Olympus harness extension.
3. **Phase 02+:** implement Olympus.

No destructive implementation happens before phase 00 and phase 01 are complete.

## Legacy Snapshot

The original OAL tree must be preserved as reference in:

```text
oal_legacy/
```

`oal_legacy/` must be added to `.gitignore`.

The legacy snapshot is for study only. Olympus does not import legacy code by inertia.

## Preservation Policy

Do not delete or strip these merely because they are old:

- lint configs
- formatter configs
- TypeScript configs
- package manager configs
- test configs
- CI configs
- build configs
- useful scripts
- third_party reference material
- source catalogs that prove a useful pattern
- acceptance/validation infrastructure

Classify each as one of:

- KEEP_AS_IS
- ADAPT_FOR_OLYMPUS
- REAUTHOR_FOR_OLYMPUS
- MOVE_TO_LEGACY_ONLY
- DELETE_AFTER_REPLACEMENT
- UNKNOWN_PROTECT

## Deletion Policy

Deletion is allowed only after:

1. phase-00 study exists,
2. phase-01 design exists,
3. `oal_legacy/` exists and is gitignored,
4. the path has an explicit classification,
5. the replacement or reason is documented.

## Active Authority Files

- `PLAN.md`
- `olympus-impl/PHASES.md`
- `olympus-impl/CHECKLIST.md`
- `olympus-impl/studies/oal-architecture.md`
- `olympus-impl/studies/oal-pipeline.md`
- `olympus-impl/design/olympus-harness.md`
- `olympus-impl/state/current.md`
- `olympus-impl/state/next.md`
- `olympus-impl/state/blocker.md`
