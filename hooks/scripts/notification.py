#!/usr/bin/env python3
"""Notification hook: audit logging for notifications.

Logs notification events for enterprise audit trail.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, passthrough, audit_log


def main():
    data = read_stdin()
    message = data.get("message", data.get("notification", ""))

    audit_log(
        "Notification",
        "notification.py",
        "notified",
        reason=str(message)[:200] if message else "empty",
    )
    passthrough()


if __name__ == "__main__":
    main()
