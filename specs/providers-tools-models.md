# Providers, tools, and models

## Providers

| Provider         | Required | Sync mode       | Default         | macOS install                  | Probe                                                | Provenance                                                              |
| ---------------- | -------- | --------------- | --------------- | ------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `caveman`        | true     | git-exact       | sync-only       | n/a                            | n/a                                                  | `providers/caveman/upstream`, `providers/caveman/overlay`               |
| `rtk`            | true     | external-binary | external-binary | `brew install rtk-ai/tap/rtk`  | `rtk --version`; `rtk gain`; `rtk rewrite <command>` | `providers/rtk/upstream`, `providers/rtk/overlay`                       |
| `bmad-method`    | true     | git-extract     | sync-extract    | n/a                            | n/a                                                  | `providers/bmad-method/upstream`, `providers/bmad-method/overlay`       |
| `taste-skill`    | true     | git-exact       | sync-only       | n/a                            | n/a                                                  | `providers/taste-skill/upstream`, `providers/taste-skill/overlay`       |
| `context7`       | false    | optional-cli    | cli-only        | `bunx --bun @upstash/context7` | `context7 --version`; `ctx7 --version`               | `providers/context7/upstream`, `providers/context7/overlay`             |
| `playwright-cli` | false    | optional-cli    | cli-only        | `bunx playwright-cli`          | `playwright-cli --help`                              | `providers/playwright-cli/upstream`, `providers/playwright-cli/overlay` |
| `deepwiki`       | false    | optional-cli    | cli-only        | `bunx deepwiki`                | `deepwiki --help`                                    | `providers/deepwiki/upstream`, `providers/deepwiki/overlay`             |

Provider sync is git-based. Required providers clone/fetch/checkout upstream git repositories into `providers/<name>/upstream`, record commit SHA, and preserve OAL overlays in `providers/<name>/overlay`.

## Tools

| Tool             | Required | macOS install                                 | Linux install                                              |
| ---------------- | -------- | --------------------------------------------- | ---------------------------------------------------------- |
| `homebrew`       | false    | official Homebrew install script when missing | not used                                                   |
| `rust`           | false    | `brew install rustup-init`, `rustup-init -y`  | official rustup install script                             |
| `node`           | false    | `brew install node`                           | detected package manager package                           |
| `bun`            | true     | `brew install oven-sh/bun/bun`                | Bun install script                                         |
| `rtk`            | true     | `brew install rtk-ai/tap/rtk`                 | upstream RTK install script                                |
| `ripgrep`        | true     | `brew install ripgrep`                        | detected package manager package                           |
| `fd`             | true     | `brew install fd`                             | detected package manager package                           |
| `ast-grep`       | true     | `brew install ast-grep`                       | detected package manager package or upstream fallback      |
| `repomix`        | false    | `bunx repomix`                                | `bunx repomix`                                             |
| `gh`             | false    | `brew install gh`                             | detected package manager package                           |
| `jq`             | true     | `brew install jq`                             | detected package manager package                           |
| `just`           | false    | `brew install just`                           | detected package manager package or upstream fallback      |
| `mise`           | false    | `brew install mise`                           | upstream mise installer                                    |
| `uv`             | false    | `brew install uv`                             | detected package manager package or upstream fallback      |
| `ruff`           | false    | `brew install ruff`                           | detected package manager package or `uv tool install ruff` |
| `hyperfine`      | false    | `brew install hyperfine`                      | detected package manager package                           |
| `act`            | false    | `brew install act`                            | detected package manager package or upstream release       |
| `eza`            | false    | `brew install eza`                            | detected package manager package                           |
| `bat`            | false    | `brew install bat`                            | detected package manager package                           |
| `gum`            | false    | `brew install gum`                            | detected package manager package or Charm package          |
| `context7`       | false    | upstream CLI package                          | upstream CLI package                                       |
| `playwright-cli` | false    | `bunx playwright-cli`                         | `bunx playwright-cli`                                      |

## Codex model set

Codex consumer profiles:

- `plus` default
- `pro-5`
- `pro-20`

Codex source links:

- `https://help.openai.com/en/articles/11369540-codex-in-chatgpt`
- `https://help.openai.com/en/articles/6825453-chatgpt-rate-limits`

Allowed runtime models:

| Model           | Efforts             | OAL fit                                                                                  |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| `gpt-5.5`       | medium, high        | planning, architecture, research synthesis, orchestration, final risk review             |
| `gpt-5.3-codex` | medium, high, xhigh | implementation, debugging, refactors, code review, long coding loops                     |
| `gpt-5.4-mini`  | medium, high, xhigh | bounded utility, classification, docs checks, route selection, fast validation summaries |

Codex defaults:

| Route               | Default               | Fallback              | Reason                          |
| ------------------- | --------------------- | --------------------- | ------------------------------- |
| `plan`              | `gpt-5.5 high`        | `gpt-5.5 medium`      | architecture coherence          |
| `research`          | `gpt-5.5 high`        | `gpt-5.3-codex high`  | synthesis and source discipline |
| `implement`         | `gpt-5.3-codex high`  | `gpt-5.3-codex xhigh` | coding-specialized path         |
| `debug`             | `gpt-5.3-codex xhigh` | `gpt-5.5 high`        | long causal tracing             |
| `review`            | `gpt-5.3-codex high`  | `gpt-5.5 high`        | code-specific risk detection    |
| `utility`           | `gpt-5.4-mini medium` | `gpt-5.4-mini high`   | cheap bounded work              |
| `classify_contract` | `gpt-5.4-mini high`   | `gpt-5.5 medium`      | semantic classification         |

No other Codex model ids render.

## OpenCode free fallback set

Models:

- `opencode/nemotron-3-super-free`
- `opencode/minimax-m2.5-free`
- `opencode/ling-2.6-flash-free`
- `opencode/hy3-preview-free`
- `opencode/big-pickle`

Routes:

| Route       | Order                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implement` | `opencode/big-pickle`, `opencode/minimax-m2.5-free`, `opencode/hy3-preview-free`, `opencode/ling-2.6-flash-free`, `opencode/nemotron-3-super-free` |
| `debug`     | `opencode/minimax-m2.5-free`, `opencode/big-pickle`, `opencode/hy3-preview-free`, `opencode/nemotron-3-super-free`, `opencode/ling-2.6-flash-free` |
| `utility`   | `opencode/ling-2.6-flash-free`, `opencode/hy3-preview-free`, `opencode/nemotron-3-super-free`, `opencode/minimax-m2.5-free`, `opencode/big-pickle` |
| `review`    | `opencode/minimax-m2.5-free`, `opencode/big-pickle`, `opencode/nemotron-3-super-free`, `opencode/hy3-preview-free`, `opencode/ling-2.6-flash-free` |

## Claude Code model set

Claude Code consumer profiles:

- `max-5` default
- `max-20`

Blocked consumer profile:

- `plus`

Claude source link:

- `https://support.claude.com/en/articles/11049741-what-is-the-max-plan`

Allowed runtime models:

- `claude-sonnet-4-6`
- `claude-haiku-4-5`
- `claude-opus-4-7`

Suggested routes:

| Route       | Default             | Fallback            |
| ----------- | ------------------- | ------------------- |
| `plan`      | `claude-opus-4-7`   | `claude-sonnet-4-6` |
| `research`  | `claude-opus-4-7`   | `claude-sonnet-4-6` |
| `implement` | `claude-sonnet-4-6` | `claude-opus-4-7`   |
| `debug`     | `claude-opus-4-7`   | `claude-sonnet-4-6` |
| `review`    | `claude-sonnet-4-6` | `claude-opus-4-7`   |
| `utility`   | `claude-haiku-4-5`  | `claude-sonnet-4-6` |
