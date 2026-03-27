# Codex Config Notes

Codex supports both global and project config files. The basic flow is `~/.codex/config.toml` for user defaults plus `.codex/config.toml` for repo-specific overrides, with CLI flags able to override config at runtime. Sources: <https://developers.openai.com/codex/config-basic>, <https://developers.openai.com/codex/config-reference>, <https://developers.openai.com/codex/config-sample>

## openagentsbtw Profiles

openagentsbtw installs managed `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, and selected `openagentsbtw` profiles into `~/.codex/config.toml` rather than overwriting arbitrary top-level user settings.

- `openagentsbtw-plus`
  Defaults to `gpt-5.3-codex` with medium reasoning for the main interactive session.
- `openagentsbtw-pro`
  Defaults to `gpt-5.4` with high reasoning for the main interactive session.
- `openagentsbtw-codex-mini`
  Defaults to `gpt-5.1-codex-mini` with low reasoning for narrow high-volume work.
- `openagentsbtw`
  Tracks the selected install preset so users can still refer to one stable profile name.

All four profiles set the same operational defaults:

- `plan_mode_reasoning_effort = "high"` except the codex-mini profile, which stays low
- `model_verbosity = "medium"` except the codex-mini profile, which stays low
- `personality = "none"`
- `commit_attribution = "Co-Authored-By: Codex <codex@users.noreply.github.com>"`
- `approval_policy = "on-request"`
- `sandbox_mode = "workspace-write"`
- `service_tier = "flex"`
- `codex_hooks = true`
- `multi_agent = true`
- `fast_mode = false`

The matching repo sample is in `codex/templates/config.toml`.

## Attribution And Style

Codex exposes native `commit_attribution` in `config.toml`. openagentsbtw uses that for Codex instead of teaching the shared ship skill to emit a Codex-specific trailer, because the config surface is the documented source of truth and it avoids duplicate attribution when the user commits from Codex.

We also set `personality = "none"` in the managed Codex profiles. The response style is intentionally driven by `AGENTS.md`, the custom agent TOMLs, and wrapper prompts so the Codex output stays close to the old CCA contract instead of mixing in a separate personality overlay.

## Plan Mode Limit

`plan_mode_reasoning_effort` only changes reasoning depth inside native plan mode. It does not bind `/plan` to a specific custom agent or model family. openagentsbtw therefore uses wrapper commands plus custom agent TOMLs for role-shaped routing, and documents native `/plan` as reasoning mode rather than role selection.

## Fast Mode

OpenAI documents Fast mode and the `service_tier` controls separately. openagentsbtw disables Fast mode in the profile because the system depends on deeper planning, stronger review, and predictable hook execution rather than lowest-latency behavior. Sources: <https://developers.openai.com/codex/speed>, <https://developers.openai.com/codex/config-reference>

## AGENTS Fallbacks

Codex supports project doc fallback filenames. We intentionally keep openagentsbtw centered on real `AGENTS.md` files rather than fallback-only behavior, because the Codex docs make `AGENTS.md` the primary project-instruction surface. Source: <https://developers.openai.com/codex/guides/agents-md>

## Install Behavior

The installer appends a managed profile block instead of attempting a full TOML rewrite. If the user already has a default `profile = ...` set, the installer preserves it and leaves profile selection to the user. If no default profile exists, the installer points `profile = ...` at the selected preset, either `openagentsbtw-plus` or `openagentsbtw-pro`.
