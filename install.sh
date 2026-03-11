#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

TARGET_DIR=""
USE_SYMLINK=false
INSTALL_SCOPE="project"
USE_PREMIUM=false

usage() {
    echo -e "${GREEN}Claude Code Agent Installer${NC}"
    echo -e "Usage: $0 <target-dir>|--global [--symlink] [--premium]"
    echo -e "  <target-dir>   : Path to your project"
    echo -e "  --global       : Install to global ~/.claude/"
    echo -e "  --symlink      : Use symlinks instead of copies"
    echo -e "  --premium      : Set architect agent model to opus"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --symlink) USE_SYMLINK=true; shift ;;
        --global) INSTALL_SCOPE="global"; shift ;;
        --premium) USE_PREMIUM=true; shift ;;
        -h|--help) usage ;;
        *)
          if [[ -z "$TARGET_DIR" ]]; then
              TARGET_DIR="$1"
          else
              echo -e "${RED}Error: Too many arguments${NC}"
              usage
          fi
          shift
          ;;
    esac
done

if [[ "$INSTALL_SCOPE" == "global" ]]; then
    TARGET_DIR="$HOME"
    CLAUDE_DIR="$HOME/.claude"
    echo -e "${GREEN}Installing Claude Code agents to GLOBAL directory: $CLAUDE_DIR${NC}\n"
else
    if [[ -z "$TARGET_DIR" ]]; then
        echo -e "${RED}Error: Target directory required, or use --global${NC}\n"
        usage
    fi
    if [[ ! -d "$TARGET_DIR" ]]; then
        echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
        exit 1
    fi
    TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
    CLAUDE_DIR="$TARGET_DIR/.claude"
    echo -e "${GREEN}Installing Claude Code agents to: $TARGET_DIR${NC}\n"
fi

mkdir -p "$CLAUDE_DIR"/{agents,skills,hooks/scripts}

install_file() {
    local src="$1" dest="$2"
    if $USE_SYMLINK; then
        [[ -e "$dest" || -L "$dest" ]] && rm -f "$dest"
        ln -s "$src" "$dest"
        echo -e "  ${GREEN}Linked${NC}: $(basename "$dest")"
    else
        cp "$src" "$dest"
        echo -e "  ${GREEN}Copied${NC}: $(basename "$dest")"
    fi
}

echo "Installing agents..."
for agent in "$REPO_DIR"/agents/*.md; do
    [[ -f "$agent" ]] && install_file "$agent" "$CLAUDE_DIR/agents/$(basename "$agent")"
done

if $USE_PREMIUM; then
    ARCH_FILE="$CLAUDE_DIR/agents/architect.md"
    if [[ -f "$ARCH_FILE" ]]; then
        sed -i '' 's/^model: sonnet$/model: opus/' "$ARCH_FILE" 2>/dev/null || \
        sed -i 's/^model: sonnet$/model: opus/' "$ARCH_FILE"
        echo -e "  ${YELLOW}Premium${NC}: architect set to opus"
    fi
fi
echo

echo "Installing skills..."
for skill_dir in "$REPO_DIR"/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name=$(basename "$skill_dir")
    mkdir -p "$CLAUDE_DIR/skills/$skill_name"
    for skill_file in "$skill_dir"*; do
        [[ -f "$skill_file" ]] && install_file "$skill_file" "$CLAUDE_DIR/skills/$skill_name/$(basename "$skill_file")"
    done
done
echo

echo "Installing hooks..."
HOOKS_JSON_SRC="$REPO_DIR/hooks/hooks.json"
HOOKS_JSON_DEST="$CLAUDE_DIR/hooks.json"
if [[ -f "$HOOKS_JSON_SRC" ]]; then
    if [[ -f "$HOOKS_JSON_DEST" ]]; then
        echo -e "  ${YELLOW}Warning${NC}: hooks.json already exists"
        echo -e "  ${YELLOW}         ${NC}Please manually merge: $HOOKS_JSON_SRC"
    else
        install_file "$HOOKS_JSON_SRC" "$HOOKS_JSON_DEST"
    fi
fi

for script in "$REPO_DIR"/hooks/scripts/*; do
    [[ -f "$script" ]] || continue
    dest="$CLAUDE_DIR/hooks/scripts/$(basename "$script")"
    install_file "$script" "$dest"
    chmod +x "$dest"
done
echo

if [[ -d "$REPO_DIR/templates/rules" ]]; then
    echo "Installing rules..."
    mkdir -p "$CLAUDE_DIR/rules"
    for rule in "$REPO_DIR"/templates/rules/*.md; do
        [[ -f "$rule" ]] || continue
        install_file "$rule" "$CLAUDE_DIR/rules/$(basename "$rule")"
    done
    echo
fi

echo -e "${GREEN}Installation complete!${NC}\n"
echo "Installed:"
echo "  - 3 agents:  architect, implement, verify"
echo "  - 7 skills:  coding-standards, refactor, desloppify, git-workflow,"
echo "               security-checklist, code-review, performance-guide"
echo "  - 3 hooks:   LSP diagnostics, auto-format, agent delegation observer"
echo "  - Rules:     language-specific (.claude/rules/)"
echo
echo "Next steps:"
echo "  1. Design:    @architect Plan a new feature"
echo "  2. Implement: @implement Implement X"
echo "  3. Verify:    @verify Run tests for X"
echo
if ! $USE_PREMIUM; then
    echo "Tip: Re-run with --premium to set architect model to opus"
    echo
fi
