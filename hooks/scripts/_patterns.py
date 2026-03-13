#!/usr/bin/env python3
"""Shared regex patterns for hook scripts.

Used by anti-placeholder, anti-comment-slop, completion-check,
and pre-commit-quality hooks.
"""

import re

# --- Placeholder patterns (hard block) ---
PLACEHOLDER_HARD = [
    re.compile(r'\bTODO\b(?!\s*\(.*test)'),
    re.compile(r'\bFIXME\b'),
    re.compile(r'\bHACK\b'),
    re.compile(r'\bXXX\b'),
    re.compile(r'\btodo!\s*\(\s*\)'),
    re.compile(r'\bunimplemented!\s*\(\s*\)'),
    re.compile(r'raise\s+NotImplementedError'),
    re.compile(r'(def\s+\w+\([^)]*\)\s*:\s*\n\s*pass)\s*$', re.MULTILINE),
    re.compile(r'fn\s+\w+\s*\([^)]*\)\s*(?:->[^{]*)?\{[\s]*\}'),
    re.compile(r'function\s+\w+\s*\([^)]*\)\s*\{[\s]*\}'),
]

# --- Placeholder patterns (soft warning) ---
PLACEHOLDER_SOFT = [
    re.compile(r'\bfor now\b', re.IGNORECASE),
    re.compile(r'simplified version', re.IGNORECASE),
    re.compile(r'in a real implementation', re.IGNORECASE),
    re.compile(r'\bplaceholder\b', re.IGNORECASE),
    re.compile(r'\btemporary\b', re.IGNORECASE),
    re.compile(r'quick and dirty', re.IGNORECASE),
]

# --- Comment slop patterns ---
SECTION_NARRATORS = re.compile(
    r'^\s*(?://|#|/\*)\s*(?:Constants?|Helper functions?|Imports?|Main function|'
    r'Define\s|Initialize|Setup|Configuration|Variables?|Types?|Interfaces?|'
    r'Dependencies|Exports?|Utils?|Utilities)\s*\*?/?\s*$',
    re.MULTILINE | re.IGNORECASE,
)

EDUCATIONAL_COMMENTS = re.compile(
    r'^\s*(?://|#|/\*)\s*(?:This is where we|Here we|Note that|'
    r'Now we|First we|Then we|Finally we|We need to|'
    r'This (?:function|method|class) (?:is|handles|does))\b',
    re.MULTILINE | re.IGNORECASE,
)

TAUTOLOGICAL_COMMENTS = re.compile(
    r'^\s*(?://|#|/\*)\s*(?:(?:Get|Set|Return|Check|Create|Initialize|Import|'
    r'Define|Declare|Update|Delete|Remove|Add|Process|Handle|Parse|Validate|'
    r'Calculate|Compute|Convert|Transform|Format|Render|Display|Print|Log|'
    r'Send|Fetch|Load|Save|Store|Read|Write|Open|Close)\s+(?:the\s+)?)',
    re.MULTILINE | re.IGNORECASE,
)

# --- Secret patterns ---
SECRET_PATTERNS = [
    re.compile(r'(?i)\b[A-Z0-9]{20,}[_-]?[A-Z0-9]{10,}\b'),
    re.compile(r'(?i)\b(?:api|secret|token|key|passwd|password)\s*[:=]\s*["\']?([^\s"\']{8,})'),
    re.compile(r'(?i)sk-[a-z0-9]{20,}'),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'gh[pous]_[A-Za-z0-9_]{36,}'),
    re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
]

# --- Merge conflict markers ---
MERGE_CONFLICT = re.compile(r'^(?:<{7}|={7}|>{7})\s', re.MULTILINE)

# --- Test file detection ---
TEST_FILE_RE = re.compile(
    r'(?:test_|_test\.|\.test\.|\.spec\.|tests/|__tests__/|test\.)',
    re.IGNORECASE,
)


def is_test_file(filepath: str) -> bool:
    """Return True if filepath looks like a test file."""
    return bool(TEST_FILE_RE.search(filepath))
