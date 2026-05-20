# Extensions

Extension commands provide first-party skeleton generation, static inspection,
and the explicit Aegis runtime entrypoint.

## Create a skeleton

```sh
bun run olympi -- debug extension create my-extension --dry-run
bun run olympi -- debug extension create my-extension --apply --output ./tmp
```

`--apply` requires `--output`. The command does not write a default project
extension.

Generated skeletons include `olympi-extension.json` with identity,
capabilities, side-effect declarations, verification notes, and uninstall notes.

## Inspect an extension

```sh
bun run olympi -- debug extension inspect ./tmp/my-extension --json
```

Inspection reads metadata and source text. It infers command, tool, provider,
and event indicators. It does not import or execute the extension.

## Aegis runtime

Aegis is a first-party Pi extension entrypoint for live policy checks. It wraps
pure safety policy functions. Install is explicit and project-local:

```sh
bun run olympi -- install --dry-run
bun run olympi -- install --apply
```

The default project install writes only `.pi/extensions/olympi-aegis.ts`. Pi
invokes Olympi by auto-discovering that project extension or by an explicit
one-off `pi -e /path/to/OpenAgentLayer/packages/extensions/src/aegis/pi-runtime.ts`.
Global Pi registration is explicit only:

```sh
bun run olympi -- install --global --dry-run
bun run olympi -- install --global --apply --confirm-global --provenance explicit-user-approval
```

Package-manager global `olympi` binaries are CLI-only and are not Pi extension
registration.

The documented Aegis entrypoint is the runtime extension path. Third-party
extension execution is outside the Olympi product surface.
