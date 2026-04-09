# Install (full)

The root installer supports multiple systems in one run and generates platform artifacts deterministically from `source/`.

## Install

```bash
./install.sh --claude --opencode
./install.sh --codex
./install.sh --copilot
./install.sh --all
```

If no system flags are passed, the installer prompts for each system as a toggle.

## Shared cross-platform surfaces

openagentsbtw treats the following as shared surfaces across Claude, Codex, OpenCode, and Copilot:

- `ctx7` CLI for external docs lookup workflows
- RTK enforcement for rewritable shell commands when policy is active
- Playwright CLI for browser-automation workflows
- DeepWiki MCP plus explicit `deepwiki` exploration routing

## Playwright CLI (optional)

Installs Playwright CLI for browser automation (screenshots, traces, DOM snapshots) during debugging:

```bash
./install.sh --playwright-cli
./install.sh --no-playwright-cli
```

On project-scoped installs, the installer can also run `playwright-cli install --skills` in the current repo.

## Context7 CLI (optional)

Installs a managed `ctx7` wrapper at `~/.local/bin/ctx7`:

```bash
./install.sh --ctx7-cli
./install.sh --no-ctx7-cli
```

Notes:

- Context7 is CLI-only in openagentsbtw; we do not install a managed Context7 MCP block.
- During install, openagentsbtw can prompt for a Context7 API key to raise rate limits.
- API keys are stored in `~/.config/openagentsbtw/config.env`.

## Claude options

```bash
./install.sh --claude --claude-tier 20x
./install.sh --claude --skip-rtk
```

Claude installs:

- the `xsyetopz@openagentsbtw` plugin
- user-level hooks and output style under `~/.claude/`
- optional openagentsbtw-managed RTK policy file at `~/.config/openagentsbtw/RTK.md`

## OpenCode options

```bash
./install.sh --opencode --opencode-default-model opencode/gpt-5-nano
./install.sh --opencode --opencode-model build=github-copilot/gpt-5-mini
./install.sh --opencode --opencode-model plan=opencode/qwen3.6-plus-free
```

OpenCode install also:

- writes a managed instruction file under `.opencode/instructions/` or `~/.config/opencode/instructions/`
- merges that file into the documented `instructions` array in `opencode.json`
- installs a generated runtime plugin and git hooks (when supported by your chosen OpenCode surfaces)

## Codex

```bash
./install.sh --codex --codex-tier plus
./install.sh --codex --codex-tier pro
./install.sh --codex --skip-rtk
```

Codex installation:

- copies the local plugin package into `~/.codex/plugins/openagentsbtw`
- registers the plugin in `~/.agents/plugins/marketplace.json`
- installs custom agents into `~/.codex/agents/`
- installs and merges hook config into `~/.codex/hooks.json`
- appends managed guidance to `~/.codex/AGENTS.md`
- appends managed profiles (tier-dependent) to `~/.codex/config.toml`

Codex preset summary:

- `plus`: `gpt-5.3-codex` preset for code-specialized daily work and implementation-heavy sessions
- `pro`: default high-reasoning preset using `gpt-5.2` for the main interactive session and the planning/review orchestration route
- `openagentsbtw-codex-mini`: optional lightweight profile using `gpt-5.3-codex-spark` with low reasoning/verbosity
- `openagentsbtw-longrun`: patient long-running profile for builds and test suites with `unified_exec` and a higher background terminal timeout

Installed Codex helper command (after install):

- `~/.codex/openagentsbtw/bin/openagentsbtw-codex docs ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex explore ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex trace ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex debug ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex qa ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex deepwiki ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex desloppify ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex test ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex plan ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex implement ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex review ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex longrun ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex-peer batch ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex-peer tmux ...`

## RTK enforcement (Claude, Codex, OpenCode, Copilot)

openagentsbtw enables RTK enforcement only when both conditions are true:

1. `rtk` is installed and available on `PATH`
2. `RTK.md` is present in either:
   - the current repo path ancestry (nearest file wins), or
   - `~/.config/openagentsbtw/RTK.md` (canonical global policy), with legacy fallback checks at `~/.codex/RTK.md` and `~/.claude/RTK.md`

Behavior:

- For commands where `rtk rewrite "<command>"` returns a rewrite, RTK form is enforced.
- Claude hooks auto-rewrite to the RTK command.
- Codex, OpenCode, and Copilot block the raw command and show the exact RTK replacement.
- Commands already prefixed with `rtk` pass through unchanged.
- Commands RTK cannot rewrite are not blocked by this policy.

## Post-install configuration (`config.sh`)

Use `./config.sh` to update an existing install without re-running full setup:

```bash
./config.sh --ctx7
./config.sh --no-ctx7
./config.sh --ctx7-api-key
./config.sh --deepwiki
./config.sh --no-deepwiki
./config.sh --rtk
./config.sh --no-rtk
```

Additional notes:

- `--deepwiki` and `--no-deepwiki` update installed Claude, Codex, OpenCode, and Copilot DeepWiki config surfaces in place.
- `--rtk` ensures the RTK binary is installed and writes `~/.config/openagentsbtw/RTK.md`.
- `--no-rtk` removes only the managed global `RTK.md`; it does not uninstall RTK.

## Updating

```bash
git pull
./install.sh --claude --codex --opencode --copilot
```

Re-running `install.sh` is the supported way to pick up additions/removals in generated assets.

## Installer/generator decomposition

openagentsbtw keeps install-time and generation-time responsibilities separate:

- `install.sh` is a thin Bash wrapper over `scripts/install/cli.mjs`
- `config.sh` is a thin Bash wrapper over `scripts/install/config-cli.mjs`
- `scripts/build.mjs` stages build output
- `scripts/generate.mjs` orchestrates smaller render modules under `scripts/generate/`

This decomposition keeps policy generation out of one large script and helps prevent monolithic install logic from accumulating.

## Uninstall

```bash
./uninstall.sh --claude
./uninstall.sh --opencode --codex
./uninstall.sh --all
```
