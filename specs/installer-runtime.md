# Installer runtime

Purpose: Bun installer and managed runtime contract.

Authority: normative.

## Runtime direction

- Build runtime: Bun.
- Installer runtime: Bun.
- Hook runtime: `.mjs` files that target hook executors can run.
- TypeScript source compiles or runs through Bun.
- Generated hook scripts are self-contained and must not import repo-relative TypeScript after render.
- Runtime scripts communicate through normalized JSON on stdin/stdout.

## Install scopes

- global;
- project.

Project scope defaults to the selected project root. Global scope requires an explicit target directory until provider-home writes are implemented.

## Managed files target contract

The complete managed-install contract tracks:

- surface;
- scope;
- generated bundle ID;
- target path;
- file list;
- managed block markers;
- timestamp;
- renderer version.

Current v4 implementation writes a deterministic manifest at:

- `.oal/manifest/<surface>-<scope>.json`

Current v4 manifest fields:

- `surface`
- `scope`
- `targetRoot`
- `generatedAt`
- `entries[]`

Each entry contains:

- relative `path`
- `sha256`
- artifact kind
- source record ids

## Install rules

- Create target directories as needed.
- Write only generated artifacts for the selected surface.
- Merge config through marked managed blocks once config-merge support exists.
- Respect surface-specific config scope and ownership from [surface config contract](surface-config-contract.md).
- Never overwrite unmarked user content.
- Write executable bits for hook scripts where needed.
- Verify installed files parse or execute where possible.

Current install writes full generated artifact files for the selected surface and records those files in the manifest.

## Uninstall rules

- Read manifest.
- Remove managed files.
- Remove empty managed directories.
- Remove managed config blocks.
- Leave unmarked user files untouched.

Current uninstall removes full-file generated artifacts listed in the manifest. Marked config-block removal remains queued until config merge is implemented.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
