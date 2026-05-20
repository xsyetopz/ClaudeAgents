# CLI Contract

The active CLI binary is `olympi`. Source-tree invocations are
`bun run olympi -- <command>` and `bun packages/cli/src/cli.ts <command>`.
Local development linking uses `bun link`; source-global CLI installation uses
`bun install -g "$PWD" --production --ignore-scripts` from the repository root.
That source-global command is covered by an install smoke test with isolated
`BUN_INSTALL`, is not a registry install, and is not Pi extension registration.

## Runtime and CLI foundation

Olympi's primary runtime is a first-party Pi extension/harness. Pi invokes
Olympi from the default project-local extension entrypoint, explicit global Pi
registration, or an explicit `pi -e` runtime path. The `olympi` binary is a development/admin entrypoint for source checkout,
automation, tests, status, verification, trust gates, and explicit project-local
state. It owns `.pi/olympi/**`, may update the project-local `.pi/settings.json`
package entry through explicit install/apply flows, may write
`.pi/extensions/olympi-aegis.ts` only through the explicit Aegis project install
flow, and may write global `~/.pi/agent/extensions/olympi-aegis.ts` only when
`--global --apply --confirm-global --provenance explicit-user-approval` is
provided. Excluded modes are standalone replacement-for-Pi behavior,
implicit global Pi installation, and undeclared provider-home writes by
default.

The install decision is singular: default install registers the Pi extension in
the current project, `--global` registers it globally for Pi, and a
package-manager global binary installs only CLI availability into the package
manager's global bin.

Normal command routing uses Commander.js. Interactive terminal prompts use
`@inquirer/prompts`; non-TTY input remains line-driven so scripts do not block.
Errors must name the failed command/input, expected shape or allowed values, and
whether files were written. JSON errors use `ok: false`, `error.code`,
`error.message`, optional `error.input`/`error.expected`, and `written`.

## Product shape

Olympi uses a Pi-native surface split. Normal user workflows are Pi slash
commands, prompt templates, skills, hooks, and automatic RTK/tool shims after
project-local install. The CLI is not the main workflow surface; it exists for
install, uninstall, doctor/status/report administration, source-checkout CI, and
internal contract checks.

Default operation is human-present: the user is available for decisions,
confirmations, blockers, and review. Olympi does not launch provider agents.
Autonomous execution is never inferred from CLI/non-TTY use; any autonomous path
must still pass the same policy, hook, provenance, blocker, and verification
gates.

## Default user command surface

The default user command surface is Pi slash commands and skill commands after
project-local install:

- `/olympi-goal <goal>`
- `/olympi-plan <step>`
- `/olympi-execute <task>`
- `/olympi-complete`
- `/olympi-resume <goal-id>`
- `/olympi-handoff`
- `/olympi-doctor`
- `/olympi-status`
- `/skill:olympi-goal-loop`
- `/skill:olympi-code-intelligence`

The CLI default surface is bootstrap/admin only: `install`, `uninstall`,
`doctor`, `status`, `report`, and `help`.
- `install [--dry-run|--apply] [--global --confirm-global --provenance explicit-user-approval] [--json]`
- `uninstall <package-id> --project [--dry-run|--apply] [--json]`
- `status [--json]`
- `doctor [--json]`
- `report status [--json]`
- `report handoff [--statusline <pi-statusline>] [--json]`
- `report acceptance [--json]`

Default help MUST stay short and MUST NOT expose debug commands, provider
deployment terms, Aegis, broker, sandbox, package-manifest internals, or package
names a first-time user must understand before giving a goal.

## CI/internal developer command surface

- `dev package inspect <source> [--json]`
- `dev package evaluate <source> [--json]`
- `dev package risk <source> [--json]`
- `dev install <source> --project [--dry-run|--apply] [--executable --signature-digest <sha256>] [--json]`
- `dev uninstall <package-id> --project [--dry-run|--apply] [--json]`
- `dev hooks policy [--json]`
- `dev intelligence status [--json]`
- `dev intelligence refresh [--json]`
- `dev intelligence context [--json]`
- `dev feedback list [--json]`
- `dev feedback record --source <source> --problem <text> [--evidence <text>] [--affected <path>] [--json]`
- `dev skills [--json]`
- `dev provenance [--json]`
- `dev doctor [--json]`
- `dev verify [--json]`
- `dev catalog [--json]`

Developer/CI mode may expose hooks, skills, provenance, verification, package
metadata, dry-run plans, and state details. These surfaces are internal/admin
contracts and must not be documented as the normal user workflow.

## Internal and admin command surface

Source-checkout tests and CI may invoke explicit internal forms for package
inspection, safety diagnostics, verification, catalog, and debug artifacts.
Top-level CLI routing is allowlisted to the public, admin/security, and
internal surfaces described above. `package` is limited to package
intake/inspection/evaluation/risk administration. `safety` is limited to
security diagnostics and policy/trust/sandbox checks. A command absent from the
allowlist returns malformed usage with the public command set.

## Debug and authoring diagnostics

Niche diagnostics and package-owned authoring utilities live behind explicit
`debug` forms. `verify` and `catalog` are developer/CI contracts under `dev`;
`doctor` is the user-facing health command for installation, runtime, RTK, Pi,
hooks, and state.

- `debug context statusline --statusline <pi-statusline> [--json]`
- `debug context compact-advice --statusline <pi-statusline> [--after-handoff] [--threshold-percent <n>] [--json]`
- `debug compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]`
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

- `install --apply` writes only the default project-local Pi extension
  registration at `.pi/extensions/olympi-aegis.ts`.
- `install --global --dry-run` previews global Pi registration without writing.
- `install --global --apply` is blocked unless paired with `--confirm-global`
  and `--provenance explicit-user-approval`; when allowed, it writes only
  `~/.pi/agent/extensions/olympi-aegis.ts`.
- `install <source> [--project] --apply` writes only Olympi-owned project-local
  mirror, lock, manifest, audit, and settings package entries.
- `install <source> [--project] --executable --signature-digest <sha256> --apply`
  stages executable package mirror, manifest, and trusted-executable lock without
  enabling settings load.
- `safety trust executable-load --package-id <id> --apply` writes the
  project-local settings package entry only after manifest, lock, signature, and
  sandbox proof pass.
- `uninstall <package-id> --project --apply` removes only manifest-owned
  resources with matching hashes.
- Pi slash workflow commands may write saved goal state only with explicit
  save/apply semantics and project-local provenance. Internal CLI fixtures for
  goal state follow the same `.pi/olympi/goals/<goal-id>.json`, policy, and
  audit boundaries.
- `report status|handoff|acceptance --write`, `debug handoff current --write`,
  and `debug audit append ... --apply` write only under project-local
  `.pi/olympi/**` paths.
- `debug resources install --project --apply` installs only first-party Olympi
  resources into project-local Pi settings and manifest-owned `.pi/olympi/**`
  paths.
- `safety hooks aegis-install --apply` writes only `.pi/extensions/olympi-aegis.ts`
  in the current project; `--global` follows the same explicit global gates as
  `install --global`.
- `debug profile set --name <name> --apply` writes only
  `.pi/olympi/profile.json`.
- `debug extension create <name> --apply --output <directory>` writes only to
  the explicit output directory.
- `debug module hephaestus apply <plan-file> --apply` writes only operation
  paths from a proven plan and appends project-local audit.

Malformed usage returns exit code 2; safety blocks return exit code 3.

## Interaction wrapper

`pi` is the interactive surface. `olympi` prints short bootstrap/admin help and
must not launch a parallel workflow console. Package, safety, and internal
admin/CI commands remain scoped under explicit namespaces and MUST NOT appear
as normal workflow commands in default startup help.
Unknown interactive commands report the supported admin controls.

Apply flows show dry-run output first and require a confirmation that names the
package id and project-local `.pi` target. Safety details are printed by
`doctor`, `status`, scoped developer commands, or action-local confirmations, not
by startup banners.

## Verification and blocker behavior

Completion requires objective-specific evidence, passing verification command
records, and no active blockers. Blocked states are valid outcomes and must
report the exact required next action. Continuing unrelated edits after missing
credentials, missing files, ambiguous ownership, unavailable commands, failing
environments, impossible constraints, safety vetoes, or repeated failures is a
CLI/product defect.

Bounded team orchestration is a planning capability exposed through Pi workflow
resources, not a provider-agent or swarm launcher. It records independent step
assignments only when each assignment has explicit non-overlapping paths, the
saved goal has no active blocker, the worker count is between 2 and 4, and a
parent integration step is created for merge/review/verification ownership.
