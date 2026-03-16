#!/usr/bin/env python3
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import (
    PLACEHOLDER_SOFT,
    read_stdin,
    block,
    warn,
    passthrough,
)

SCOPE_REDUCTION = [
    re.compile(r"simplified version", re.IGNORECASE),
    re.compile(r"can be added later", re.IGNORECASE),
    re.compile(r"out of scope for now", re.IGNORECASE),
    re.compile(r"I (?:skipped|omitted|left out|didn'?t implement)", re.IGNORECASE),
    re.compile(r"deferred? (?:to|for) (?:later|future|next)", re.IGNORECASE),
    re.compile(r"(?:stub|mock|dummy|noop|no-op) (?:implementation|version)", re.IGNORECASE),
]


def main() -> None:
    data = read_stdin()
    if not data:
        passthrough()

    text = data.get("tool_response", str(data))
    if not text:
        passthrough()

    hits = []
    for line in text.splitlines():
        stripped = line.strip()
        for pat in SCOPE_REDUCTION:
            m = pat.search(stripped)
            if m:
                hits.append(f"  {stripped[:80]}")
                break

    if not hits:
        passthrough()

    unique = list(dict.fromkeys(hits))[:10]
    output = f"Scope reduction detected ({len(unique)} instance(s)):\n" + "\n".join(unique)
    block(output + "\n\nAgent silently reduced scope. Must explicitly flag what was dropped and why.")


if __name__ == "__main__":
    main()
