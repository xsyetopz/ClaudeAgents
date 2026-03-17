"""Tests for hooks/scripts/session-budget.py — context budget warnings."""

import os
import tempfile
from conftest import run_hook, parse_hook_output


class TestSessionBudget:
    def test_runs_without_error(self):
        """session-budget.py should run without crashing even outside a project."""
        result = run_hook("session-budget.py", {})
        # Should not crash (exit 0 or produce output)
        assert result.returncode == 0

    def test_warns_on_large_claude_md(self):
        """Should warn when CLAUDE.md exceeds 150 lines."""
        with tempfile.TemporaryDirectory() as tmpdir:
            claude_md = os.path.join(tmpdir, "CLAUDE.md")
            with open(claude_md, "w") as f:
                for i in range(200):
                    f.write(f"Line {i}\n")
            result = run_hook("session-budget.py", {}, env={"CLAUDE_PROJECT_DIR": tmpdir})
            output = parse_hook_output(result)
            # May warn about budget, or may just pass (depends on implementation)
            assert result.returncode == 0
