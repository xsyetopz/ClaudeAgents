# Extensions

Olympus 0.1.0 supports first-party Pi extension authoring and inspection. It does not execute third-party extension code.

## Create

Dry-run:

```sh
bun run olympus -- extension create my-extension --dry-run
```

Apply to an explicit directory:

```sh
bun run olympus -- extension create my-extension --apply --output ./tmp
```

There is no default write to project `.pi` for extension creation.

## Metadata

Generated skeletons include `olympus-extension.json`. The metadata records extension identity, side-effect declarations, and declared capabilities so future trust gates can reason about command, tool, provider, and event behavior.

## Inspect

```sh
bun run olympus -- extension inspect ./tmp/my-extension --json
```

Inspection reads metadata and source shape. It infers command/tool/provider/event indicators conservatively and reports conflicts or missing metadata without running extension code.
