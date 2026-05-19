# CLI Contract

The active binary is `olympi`. Source-tree invocations are
`bun run olympi -- <command>` and `bun packages/cli/src/cli.ts <command>`.
Local development linking uses `bun link`; source-global installation uses
`bun install -g "$PWD" --production --ignore-scripts` from the repository root.
That source-global command is covered by an install smoke test with isolated
`BUN_INSTALL` and is not a registry install.

## Product shape

Olympi is a Pi-based harness layer for agentic coding work. The CLI is not a
menu of package internals. Public commands map to harness workflows:

- human-present console;
- local harness readiness and state inspection;
- Pi package/resource intake;
- project-local policy-gated install and manifest-backed uninstall;
- status/handoff/acceptance reporting;
- policy, hook, sandbox, broker, and trust gate inspection.

Default operation is human-present: the user is available for decisions,
confirmations, blockers, and review. Autonomous mode must be selected explicitly
by caller/provider configuration and still requires policy gates, provenance,
blocker handling, and verification evidence.

## Public command surface

- `olympi` / `olympi interactive`
- `setup status [--json]`
- `status [--json]`
- `verify [--json]`
- `catalog [--json]`
- `package inspect <source> [--json]`
- `package evaluate <source> [--json]`
- `package risk <source> [--json]`
- `install <source> --project [--dry-run|--apply] [--executable --signature-digest <sha256>] [--json]`
- `uninstall <package-id> --project [--dry-run|--apply] [--json]`
- `report status [--write] [--json]`
- `report handoff [--write] [--statusline <pi-statusline>] [--threshold-percent <n>] [--json]`
- `report acceptance [--write] [--json]`
- `report package-risk <source> [--json]`
- `safety check [--json]`
- `safety hooks policy [--json]`
- `safety hooks aegis-runtime [--json]`
- `safety hooks aegis-install --project [--dry-run|--apply] [--json]`
- `safety sandbox check [--json]`
- `safety broker validate <fixture> [--json]`
- `safety trust status [--json]`
- `safety trust executable-proof --package-id <id> [--signature-digest <sha256>] [--json]`
- `safety trust executable-load --package-id <id> [--signature-digest <sha256>] [--apply] [--json]`

No undocumented compatibility aliases are part of the contract. A command absent
from this public surface or the explicit `debug` surface must return malformed
usage instead of routing to a legacy path.

## Debug and authoring diagnostics

Niche diagnostics and package-owned authoring utilities live behind explicit
`debug` forms. `verify` and `catalog` are intentionally not debug commands:
verification gates are part of normal harness operation, and the catalog is
user-facing command/policy capability discovery.

- `debug context statusline --statusline <pi-statusline> [--json]`
- `debug context compact-advice --statusline <pi-statusline> [--after-handoff] [--threshold-percent <n>] [--json]`
- `debug compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]`
- `debug rtk status [--json]`
- `debug rtk plan <command...> [--json]`
- `debug quota status [--json]`
- `debug lock queue <paths...> [--json]`
- `debug profile status [--json]`
- `debug profile set --name <name> [--apply] [--json]`
- `debug resources validate [path] [--json]`
- `debug resources install --project [--dry-run|--apply] [--json]`
- `debug prompt contract <input-or-file> [--json]`
- `debug review plan <plan-file> [--json]`
- `debug review diff <diff-file> [--json]`
- `debug handoff current [--write] [--statusline <pi-statusline>] [--threshold-percent <n>] [--json]`
- `debug module status [--json]`
- `debug module run <module> --dry-run [--json]`
- `debug module hephaestus proof <plan-file> [--json]`
- `debug module hephaestus apply <plan-file> [--apply] [--json]`
- `debug extension inspect <path> [--json]`
- `debug extension create <name> [--dry-run|--apply --output <directory>] [--json]`
- `debug audit append <event> --detail <detail> --apply [--json]`

`plan <operation>` is not public. Install/uninstall previews are the dry-run
forms of `install` and `uninstall`.

## Mutating commands

Mutating behavior is explicit and scoped:

- `install <source> --project --apply` writes only Olympi-owned project-local
  mirror, lock, manifest, audit, and settings package entries.
- `install <source> --project --executable --signature-digest <sha256> --apply`
  stages executable package mirror, manifest, and trusted-executable lock without
  enabling settings load.
- `safety trust executable-load --package-id <id> --apply` writes the
  project-local settings package entry only after manifest, lock, signature, and
  sandbox proof pass.
- `uninstall <package-id> --project --apply` removes only manifest-owned
  resources with matching hashes.
- `report status|handoff|acceptance --write`, `debug handoff current --write`,
  and `debug audit append ... --apply` write only under project-local
  `.pi/olympi/**` paths.
- `debug resources install --project --apply` installs only first-party Olympi
  resources into project-local Pi settings and manifest-owned `.pi/olympi/**`
  paths.
- `safety hooks aegis-install --project --apply` writes only
  `.pi/extensions/olympi-aegis.ts` in the current project.
- `debug profile set --name <name> --apply` writes only
  `.pi/olympi/profile.json`.
- `debug extension create <name> --apply --output <directory>` writes only to
  the explicit output directory.
- `debug module hephaestus apply <plan-file> --apply` writes only operation
  paths from a proven plan and appends project-local audit.

Malformed usage returns exit code 2; safety blocks return exit code 3.

## Interactive wrapper

`olympi` or `olympi interactive` starts with the product name, current project
root, `.pi/olympi` state path, state summary, public workflow list, and prompt.
The public interactive list is `package`, `install`, `uninstall`, `report`,
`safety`, `setup`, `status`, `help`, and quit controls `q`, `quit`, and `exit`.
Undocumented aliases are not accepted in the interactive wrapper.

Apply flows show dry-run output first and require a confirmation that names the
package id and project-local `.pi` target. Safety details are printed by
`safety`, `setup`, `status`, or action-local confirmations, not by startup
banners.

## Verification and blocker behavior

Completion requires objective-specific evidence, passing verification command
records, and no active blockers. Blocked states are valid outcomes and must
report the exact required next action. Continuing unrelated edits after missing
credentials, missing files, ambiguous ownership, unavailable commands, failing
environments, impossible constraints, safety vetoes, or repeated failures is a
CLI/product defect.
