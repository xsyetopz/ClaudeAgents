#!/usr/bin/env python3
"""Stop/SubagentStop hook: scans modified files for placeholder patterns.

Runs at session end to catch any incomplete work that slipped through
the per-file anti-placeholder hook. Reports file:line citations.
"""

import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _patterns import PLACEHOLDER_HARD, PLACEHOLDER_SOFT, is_test_file


def get_modified_files():
    """Get files modified in the current git working tree."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        files = result.stdout.strip().split("\n") if result.stdout.strip() else []

        result2 = subprocess.run(
            ["git", "diff", "--name-only", "--cached"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        staged = result2.stdout.strip().split("\n") if result2.stdout.strip() else []

        return list(set(files + staged))
    except Exception:
        return []


def scan_file(filepath):
    """Scan a single file for placeholder patterns. Returns list of findings."""
    if not os.path.isfile(filepath):
        return []
    if is_test_file(filepath):
        return []

    findings = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception:
        return []

    for line_num, line in enumerate(lines, 1):
        for pat in PLACEHOLDER_HARD:
            if pat.search(line):
                findings.append(
                    f"  HARD: {filepath}:{line_num} — {line.strip()[:80]}"
                )
                break

    for line_num, line in enumerate(lines, 1):
        for pat in PLACEHOLDER_SOFT:
            if pat.search(line):
                findings.append(
                    f"  SOFT: {filepath}:{line_num} — {line.strip()[:80]}"
                )
                break

    return findings


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    modified_files = get_modified_files()
    if not modified_files:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "Stop"}}))
        sys.exit(0)

    all_findings = []
    for filepath in modified_files:
        findings = scan_file(filepath)
        all_findings.extend(findings)

    if all_findings:
        hard_count = sum(1 for f in all_findings if f.startswith("  HARD:"))
        soft_count = sum(1 for f in all_findings if f.startswith("  SOFT:"))

        context = (
            f"Completion check: {hard_count} placeholder(s), {soft_count} hedge(s) "
            f"found in modified files:\n" + "\n".join(all_findings[:20])
        )

        if hard_count > 0:
            print(context, file=sys.stderr)
            sys.exit(2)

        out = {
            "hookSpecificOutput": {
                "hookEventName": "Stop",
                "additionalContext": context,
            }
        }
        print(json.dumps(out))
        sys.exit(0)

    print(json.dumps({"hookSpecificOutput": {"hookEventName": "Stop"}}))
    sys.exit(0)


if __name__ == "__main__":
    main()
