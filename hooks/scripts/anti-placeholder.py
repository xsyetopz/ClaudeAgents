#!/usr/bin/env python3
"""PostToolUse hook: detects placeholder patterns in written/edited files.

Hard block (exit 2): TODO, FIXME, HACK, XXX, todo!(), unimplemented!(),
    empty function bodies, raise NotImplementedError (outside tests).
Soft warning (additionalContext): "for now", "simplified version",
    "in a real implementation", "placeholder", "temporary", "quick and dirty".
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _patterns import PLACEHOLDER_HARD, PLACEHOLDER_SOFT, is_test_file


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    tool_input = data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not file_path:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse"}}))
        sys.exit(0)

    content = ""
    tool_name = data.get("tool_name", "")
    if tool_name == "Write":
        content = tool_input.get("content", "")
    elif tool_name == "Edit":
        content = tool_input.get("new_string", "")

    if not content:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse"}}))
        sys.exit(0)

    test_file = is_test_file(file_path)

    # Hard blocks (skip for test files)
    if not test_file:
        hard_matches = []
        for pat in PLACEHOLDER_HARD:
            matches = pat.findall(content)
            if matches:
                hard_matches.append(pat.pattern)

        if hard_matches:
            msg = (
                f"BLOCKED: Placeholder code detected in {os.path.basename(file_path)}. "
                f"Patterns: {', '.join(hard_matches[:3])}. "
                "Complete the implementation — no TODO, FIXME, stubs, or empty bodies."
            )
            print(msg, file=sys.stderr)
            sys.exit(2)

    # Soft warnings
    soft_matches = []
    for pat in PLACEHOLDER_SOFT:
        if pat.search(content):
            soft_matches.append(pat.pattern)

    if soft_matches:
        out = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": (
                    f"Warning: hedge/placeholder language detected in {os.path.basename(file_path)}: "
                    f"{', '.join(soft_matches[:3])}. "
                    "Consider replacing with complete implementation or removing the hedge language."
                ),
            }
        }
        print(json.dumps(out))
        sys.exit(0)

    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse"}}))
    sys.exit(0)


if __name__ == "__main__":
    main()
