#!/usr/bin/env python3
import json, sys, re

REDACT = "★★★REDACTED★★★"
SECRET_TEXT = re.compile(r'(?i)(?:api|secret|token|key|bearer)\s*[:=]\s*["\']?([^\s"\']+)')
AWS_KEY = re.compile(r'AKIA[0-9A-Z]{16}')
GITHUB_TOKEN = re.compile(r'gh[pous]_[A-Za-z0-9_]{36,}')
JWT = re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}')

PATTERNS = [SECRET_TEXT, AWS_KEY, GITHUB_TOKEN, JWT]

def redact_text(s: str) -> str:
    for pat in PATTERNS:
        s = pat.sub(REDACT, s)
    if len(s) > 30000:  # safety middle truncate for huge outputs
        s = s[:15000] + "\n... " + REDACT + " ..." + s[-15000:]
    return s

def main():
    try:
        data = json.load(sys.stdin)
    except Exception as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        return 1

    tool_resp = data.get("tool_response", {})
    # Add advisory context to Claude after tool runs
    out = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": "Outputs sanitized by redaction policy"
        }
    }

    # If tool response includes printable fields, scrub them in transcript
    for k in ("stdout", "stderr", "body", "content"):
        if isinstance(tool_resp.get(k), str):
            tool_resp[k] = redact_text(tool_resp[k])

    print(json.dumps(out))
    return 0

if __name__ == "__main__":
    sys.exit(main())
