# Extensions

Extension support is limited to first-party skeleton generation, static
inspection, and the explicit Aegis runtime entrypoint.

## Create a skeleton

```sh
bun run olympi -- extension create my-extension --dry-run
bun run olympi -- extension create my-extension --apply --output ./tmp
```

`--apply` requires `--output`. The command does not write a default project
extension.

Generated skeletons include `olympi-extension.json` with identity,
capabilities, side-effect declarations, verification notes, and uninstall notes.

## Inspect an extension

```sh
bun run olympi -- extension inspect ./tmp/my-extension --json
```

Inspection reads metadata and source text. It infers command, tool, provider,
and event indicators. It does not import or execute the extension.

## Aegis runtime

Aegis is a first-party Pi extension entrypoint for live policy checks. It wraps
pure safety policy functions. Install is explicit and project-local:

```sh
bun run olympi -- hooks aegis-install --project --dry-run
bun run olympi -- hooks aegis-install --project --apply
```

Third-party extension loading remains blocked until trust and sandbox gates pass.
