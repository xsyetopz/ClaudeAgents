# CLI Contract

The low-level CLI is the source of truth.

The interactive CLI wraps the low-level CLI and must not contain separate business logic.

Required low-level commands:

- `olympus inspect`
- `olympus plan`
- `olympus extension create`
- `olympus extension inspect`
- `olympus package evaluate`
- `olympus verify`
- `olympus install`
- `olympus uninstall`
