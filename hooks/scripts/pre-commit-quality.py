#!/usr/bin/env python3
"""PreToolUse hook: blocks git commit with secrets, .env files,
merge conflicts, or TODO/FIXME in staged files.

Only activates when the Bash tool command contains 'git commit'.
"""

import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _patterns import SECRET_PATTERNS, MERGE_CONFLICT, PLACEHOLDER_HARD, is_test_file


def get_staged_content():
    """Get the diff of staged files."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        files = result.stdout.strip().split("\n") if result.stdout.strip() else []
        return files
    except Exception:
        return []


def check_staged_file(filepath):
    """Check a single staged file for quality issues."""
    issues = []

    if not os.path.isfile(filepath):
        return issues

    basename = os.path.basename(filepath)
    if basename == ".env" or basename.startswith(".env."):
        issues.append(f"BLOCKED: .env file staged for commit: {filepath}")
        return issues

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return issues

    if MERGE_CONFLICT.search(content):
        issues.append(f"BLOCKED: Merge conflict markers in {filepath}")

    if not is_test_file(filepath):
        for pat in PLACEHOLDER_HARD[:4]:  # TODO, FIXME, HACK, XXX
            matches = pat.findall(content)
            if matches:
                issues.append(f"WARNING: {pat.pattern} found in {filepath}")

    for pat in SECRET_PATTERNS:
        if pat.search(content):
            issues.append(f"BLOCKED: Possible secret/credential in {filepath} (pattern: {pat.pattern[:30]}...)")
            break

    return issues


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    if tool_name != "Bash":
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse"}}))
        sys.exit(0)

    command = tool_input.get("command", "") or ""
    if "git commit" not in command and "git add" not in command:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse"}}))
        sys.exit(0)

    # For git add, just warn about .env files
    if "git add" in command and "git commit" not in command:
        env_match = re.search(r'\.env\b', command)
        if env_match:
            print("BLOCKED: Do not stage .env files for commit.", file=sys.stderr)
            sys.exit(2)
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse"}}))
        sys.exit(0)

    staged_files = get_staged_content()
    if not staged_files:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse"}}))
        sys.exit(0)

    all_issues = []
    for filepath in staged_files:
        issues = check_staged_file(filepath)
        all_issues.extend(issues)

    blockers = [i for i in all_issues if i.startswith("BLOCKED:")]
    warnings = [i for i in all_issues if i.startswith("WARNING:")]

    if blockers:
        msg = "Pre-commit quality check failed:\n" + "\n".join(blockers)
        if warnings:
            msg += "\n" + "\n".join(warnings)
        print(msg, file=sys.stderr)
        sys.exit(2)

    if warnings:
        out = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": (
                    "Pre-commit warnings:\n" + "\n".join(warnings)
                    + "\nConsider fixing these before committing."
                ),
            }
        }
        print(json.dumps(out))
        sys.exit(0)

    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse"}}))
    sys.exit(0)


if __name__ == "__main__":
    main()
