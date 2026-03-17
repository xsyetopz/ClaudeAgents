#!/usr/bin/env python3
"""PostToolUseFailure hook: log failures and detect retry loops.

Tracks consecutive failures to the same tool to prevent infinite retry loops.
Suggests alternative approaches when stuck.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, warn, passthrough, audit_log

FAILURE_LOG = "/tmp/cca-failure-log.jsonl"
MAX_CONSECUTIVE = 3


def get_recent_failures(tool_name: str) -> int:
    """Count consecutive recent failures for the same tool."""
    if not os.path.exists(FAILURE_LOG):
        return 0
    count = 0
    try:
        with open(FAILURE_LOG) as f:
            lines = f.readlines()
        for line in reversed(lines[-10:]):
            entry = json.loads(line.strip())
            if entry.get("tool") == tool_name:
                count += 1
            else:
                break
    except (json.JSONDecodeError, OSError):
        pass
    return count


def log_failure(tool_name: str, error: str):
    """Append failure to log file."""
    try:
        with open(FAILURE_LOG, "a") as f:
            f.write(json.dumps({"tool": tool_name, "error": error[:200]}) + "\n")
    except OSError:
        pass


def main():
    data = read_stdin()
    tool_name = data.get("tool_name", "unknown")
    error = data.get("tool_error", data.get("error", ""))

    log_failure(tool_name, str(error))
    audit_log("PostToolUseFailure", "post-failure.py", "logged", tool=tool_name, reason=str(error)[:200])

    consecutive = get_recent_failures(tool_name)
    if consecutive >= MAX_CONSECUTIVE:
        warn(
            f"Tool '{tool_name}' has failed {consecutive} times consecutively. "
            f"Stop retrying the same approach. Consider: "
            f"(1) a different tool, (2) a different approach, (3) asking the user for guidance.",
            event="PostToolUseFailure",
        )
    else:
        passthrough()


if __name__ == "__main__":
    main()
