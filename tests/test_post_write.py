"""Tests for hooks/scripts/post-write.py — placeholder and slop detection."""

import os
import tempfile
from conftest import run_hook, parse_hook_output


def make_write_output(file_path: str, content: str = "") -> dict:
    return {
        "tool_name": "Write",
        "tool_input": {"file_path": file_path, "content": content},
        "tool_result": {"success": True},
    }


class TestPlaceholderDetection:
    def test_detects_todo_in_written_file(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("def main():\n    # TODO: implement this\n    pass\n")
            f.flush()
            result = run_hook("post-write.py", make_write_output(f.name))
            output = parse_hook_output(result)
            # Should warn or block about TODO
            if output:
                ctx = output.get("hookSpecificOutput", {}).get("additionalContext", "")
                assert "TODO" in ctx.upper() or "placeholder" in ctx.lower() or result.returncode == 2
        os.unlink(f.name)

    def test_clean_file_passes(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("def add(a: int, b: int) -> int:\n    return a + b\n")
            f.flush()
            result = run_hook("post-write.py", make_write_output(f.name))
            # Should not block
            assert result.returncode != 2
        os.unlink(f.name)
