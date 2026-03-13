#!/usr/bin/env python3
"""PostToolUse hook: detects obvious/tautological comments in written/edited files.

Advisory only (exit 0 + additionalContext). Never blocks.
Detects: section narrators, educational comments, tautological comments.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _patterns import SECTION_NARRATORS, EDUCATIONAL_COMMENTS, TAUTOLOGICAL_COMMENTS


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

    # Skip markdown files — comments are content there
    if file_path.endswith((".md", ".mdx", ".txt", ".rst")):
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

    findings = []

    narrators = SECTION_NARRATORS.findall(content)
    if narrators:
        findings.append(f"Section narrators ({len(narrators)}): {', '.join(n.strip() for n in narrators[:3])}")

    educational = EDUCATIONAL_COMMENTS.findall(content)
    if educational:
        findings.append(f"Educational comments ({len(educational)}): {', '.join(e.strip() for e in educational[:3])}")

    tautological = TAUTOLOGICAL_COMMENTS.findall(content)
    if tautological:
        findings.append(f"Tautological comments ({len(tautological)}): {', '.join(t.strip() for t in tautological[:3])}")

    if findings:
        out = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": (
                    f"Comment quality warning in {os.path.basename(file_path)}: "
                    + "; ".join(findings)
                    + ". Comments should explain 'why', not 'what'. "
                    "Consider removing obvious comments."
                ),
            }
        }
        print(json.dumps(out))
    else:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse"}}))

    sys.exit(0)


if __name__ == "__main__":
    main()
