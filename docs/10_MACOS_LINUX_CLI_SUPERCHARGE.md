# 10 — macOS/Linux CLI Supercharge

This document lists command-line tools that make agent work faster and less ambiguous. OAL should not require all of them, but it can detect and recommend them.

## Core replacements

| Replace                   | With             | Why                                                 |
| ------------------------- | ---------------- | --------------------------------------------------- |
| `ls`                      | `eza`            | Better tree, git status, icons, metadata.           |
| `find`                    | `fd`             | Faster, simpler path search, respects ignore files. |
| `grep`                    | `rg` / ripgrep   | Fast recursive search, good defaults.               |
| `cat`                     | `bat`            | Syntax highlighting and paging.                     |
| `diff`                    | `delta`          | Better git diffs.                                   |
| `du`                      | `dust`           | Human-readable disk usage tree.                     |
| `df`                      | `duf`            | Better disk free display.                           |
| `ps`                      | `procs`          | Modern process table.                               |
| `top`                     | `btm` or `btop`  | Better process/resource UI.                         |
| `sed` simple replacements | `sd`             | Cleaner string replacement.                         |
| repeated `cd`             | `zoxide`         | Frecent directory jumping.                          |
| manual history search     | `fzf`            | Fuzzy selection for files, history, git branches.   |
| `time`                    | `hyperfine`      | Reliable command benchmarking.                      |
| `wc -l` code counts       | `tokei`          | Language-aware code statistics.                     |
| ad hoc task scripts       | `just`           | Project task runner with readable recipes.          |
| tool version sprawl       | `mise`           | Language/tool version management.                   |
| manual env exports        | `direnv`         | Directory-scoped environment loading.               |
| JSON inspection           | `jq`             | Structured JSON query/transform.                    |
| YAML/TOML-ish editing     | `yq`             | Structured YAML/JSON processing.                    |
| HTTP one-offs             | `xh` or `httpie` | Friendly HTTP requests.                             |
| network wait loops        | `gping`          | Visual ping latency.                                |
| file-change loops         | `entr`           | Rerun commands on file changes.                     |
| git TUI                   | `lazygit`        | Fast commit/stage/diff workflows.                   |
| GitHub CLI                | `gh`             | PR/issues/actions from terminal.                    |

If none of these exist, install them via user's determined operating system && package manager. For macOS users, it expects 'brew' to be installed, and if not found, installs homebrew first.

For Linux users, it attempts determining user's exact distribution, then package manager, and go from there.

## OAL recommended aliases

```bash
alias ls='eza --group-directories-first'
alias ll='eza -lah --git --group-directories-first'
alias la='eza -la --git --group-directories-first'
alias tree='eza --tree --git-ignore'
alias cat='bat --paging=never'
alias grep='rg'
alias find='fd'
alias du='dust'
alias df='duf'
```

Do not force these aliases during OAL deploy. Emit them as recommendations or optional shell snippet, or an optional addition .env file that gets injected on use, and can have its behaviour toggled off at will.

## Search patterns for agents

Use targeted repo search. Avoid broad home-directory scans.

```bash
# Find files by name
fd 'config\.(toml|json|jsonc)$' .

# Find symbol or route references
rg -n "resolveModelAssignment|model_reasoning_effort|effortLevel" .

# Find large generated files
fd . generated -t f -x wc -c {} | sort -nr | head

# See git-aware tree
eza --tree --git-ignore --level=3
```

## JSON/TOML/YAML validation helpers

```bash
# JSON parse
jq empty file.json

# JSON pretty print
jq . file.json

# YAML read
 yq '.' file.yaml

# TOML parse with Python 3.14+
python3 - <<'PY'
import sys, tomllib
for path in sys.argv[1:]:
    with open(path, 'rb') as f: tomllib.load(f)
    print('ok', path)
PY .codex/config.toml
```

## Git workflow helpers

```bash
# Review current diff with syntax highlighting
git diff | delta

# Interactive branch/file selection
git branch --all | fzf

# PR status
gh pr status

# View CI
gh run list --limit 10
gh run watch

# Safer status summary
git status --short --branch
```

## Performance and profiling helpers

```bash
# Benchmark render command
hyperfine 'bun run oal render --surface codex --plan pro-5 --out generated/codex'

# Count code by language
tokei .

# Identify large folders
dust . | head

# Watch tests on file change
fd '\.(ts|tsx|js|mjs)$' packages | entr -c bun test ./packages
```

## Project task runner with `just`

Recommended `justfile`:

```make
set shell := ["bash", "-cu"]

check:
  bun run lint
  bun run check:source
  bun run test

render surface="codex":
  bun run oal render --surface {{surface}} --plan pro-5 --out generated/{{surface}}

smoke:
  bun run oal eval --suite smoke --surface all

codex-dry:
  bun run oal deploy --surface codex --scope project --dry-run
```

## OAL diagnostics command ideas

```bash
oal doctor
```

Should check:

- `bun`, `node`, `git` present;
- optional tools present: `rg`, `fd`, `jq`, `eza`, `delta`, `hyperfine`;
- Codex/Claude/OpenCode CLI availability;
- schema cache freshness;
- whether current repo has generated artifacts out of sync;
- whether shell aliases would conflict.

## Safe install snippets

### Homebrew

```bash
brew install eza fd ripgrep bat git-delta jq yq fzf zoxide direnv mise just hyperfine tokei dust duf procs bottom lazygit gh sd entr
```

### Debian/Ubuntu base

Package names vary. Prefer distro packages when available; otherwise use project install instructions.

```bash
sudo apt update
sudo apt install -y ripgrep fd-find bat jq fzf direnv hyperfine tokei gh
```

Common Debian aliases:

```bash
mkdir -p ~/.local/bin
ln -sf "$(command -v fdfind)" ~/.local/bin/fd 2>/dev/null || true
ln -sf "$(command -v batcat)" ~/.local/bin/bat 2>/dev/null || true
```

## Agent-specific QoL rules

1. Prefer `rg` before reading individual files.
2. Prefer `fd` over broad `find`.
3. Use `git status --short --branch` before edits.
4. Use `git diff --stat` before final response.
5. Use `hyperfine` only when performance question exists.
6. Use `jq`/`yq` for structured files instead of regex rewriting.
7. Avoid `rm -rf`; use guarded cleanup scripts or trash tools.
8. Never scan `~`, `/Users`, or `~/Library` broadly.

## Optional high-value additions

| Tool                       | Use                                                 |
| -------------------------- | --------------------------------------------------- |
| `shellcheck`               | Bash script linting.                                |
| `shfmt`                    | Bash formatting.                                    |
| `biome`                    | JS/TS/JSON formatting/linting when project uses it. |
| `prettier`                 | Markdown/JSON/YAML formatting.                      |
| `hadolint`                 | Dockerfile linting.                                 |
| `actionlint`               | GitHub Actions linting.                             |
| `dotenv-linter`            | `.env` hygiene without exposing secrets.            |
| `trufflehog` or `gitleaks` | Secret scanning.                                    |
| `watchexec`                | More powerful file-watch command runner.            |
| `ast-grep`                 | Syntax-aware structural search.                     |
| `semgrep`                  | Security/static analysis rules.                     |

OAL should recommend these by project type, not install all by default.
