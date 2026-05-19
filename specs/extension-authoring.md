# Extension Authoring Contract

Olympi extension authoring is first-party skeleton generation plus static inspection.

## Create

`extension create <name> --dry-run` reports planned files. `extension create <name> --apply --output <directory>` writes a skeleton only under the explicit output directory.

Generated skeletons include source files and `olympi-extension.json` metadata with identity, side-effect declarations, and capability declarations.

## Inspect

`extension inspect <path>` reads metadata and source shape without executing code. It reports metadata validity, inferred command/tool/provider/event indicators, side-effect declarations, and conflicts.
