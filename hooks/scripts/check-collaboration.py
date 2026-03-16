#!/usr/bin/env python3
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import (
    read_stdin,
    warn,
    passthrough,
)

SYCOPHANCY = [
    re.compile(r"(?:great|excellent|good) (?:question|point|idea|suggestion|approach)", re.IGNORECASE),
    re.compile(r"(?:you'?re|that'?s) (?:absolutely|totally|completely) right", re.IGNORECASE),
    re.compile(r"I (?:completely|totally|fully) agree", re.IGNORECASE),
]

HEDGE_LANGUAGE = [
    re.compile(r"you (?:might|may) want to (?:consider|think about)", re.IGNORECASE),
    re.compile(r"could potentially", re.IGNORECASE),
    re.compile(r"it (?:might|may) be worth", re.IGNORECASE),
    re.compile(r"perhaps we (?:could|should|might)", re.IGNORECASE),
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
        for pat in SYCOPHANCY:
            if pat.search(stripped):
                hits.append(f"  sycophancy: {stripped[:80]}")
                break
        for pat in HEDGE_LANGUAGE:
            if pat.search(stripped):
                hits.append(f"  hedging: {stripped[:80]}")
                break

    if not hits:
        passthrough()

    unique = list(dict.fromkeys(hits))[:8]
    output = f"Collaboration protocol issues ({len(unique)}):\n" + "\n".join(unique)
    event = data.get("hook_event_name", "SubagentStop")
    warn(output + "\n\nState facts directly. Present options without hedging.", event=event)


if __name__ == "__main__":
    main()
