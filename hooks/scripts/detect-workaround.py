#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import (
    WORKAROUND_HARD,
    WORKAROUND_SOFT,
    read_stdin,
    block,
    warn,
    passthrough,
)


def scan_text(text: str) -> tuple[list[str], list[str]]:
    hard_hits, soft_hits = [], []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        for pat in WORKAROUND_HARD:
            m = pat.search(stripped)
            if m:
                hard_hits.append(f"  {m.group()[:80]}")
                break
        else:
            for pat in WORKAROUND_SOFT:
                m = pat.search(stripped)
                if m:
                    soft_hits.append(f"  {m.group()[:80]}")
                    break
    return hard_hits, soft_hits


def main() -> None:
    data = read_stdin()
    if not data:
        passthrough()

    text = data.get("tool_response", "")
    if not text:
        text = str(data)
    if not text:
        passthrough()

    hard_hits, soft_hits = scan_text(text)

    if not hard_hits and not soft_hits:
        passthrough()

    unique_hard = list(dict.fromkeys(hard_hits))[:5]
    unique_soft = list(dict.fromkeys(soft_hits))[:5]

    output_parts = []
    if unique_hard:
        output_parts.append(
            f"Autonomous decision detected ({len(unique_hard)} instance(s)):\n"
            + "\n".join(unique_hard)
        )
    if unique_soft:
        output_parts.append(
            f"Workaround language ({len(unique_soft)} instance(s)):\n"
            + "\n".join(unique_soft)
        )

    output = "\n\n".join(output_parts)
    event = data.get("hook_event_name", "SubagentStop")

    if unique_hard:
        block(
            output + "\n\nAgent made autonomous decisions without asking. "
            "Re-run with explicit escalation using the escalate skill."
        )
    else:
        warn(output, event=event)


if __name__ == "__main__":
    main()
