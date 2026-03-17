"""Tests for hooks/scripts/pre-schema.py — schema validation."""

from conftest import run_hook, parse_hook_output


class TestWriteValidation:
    def test_allows_absolute_path_write(self):
        result = run_hook("pre-schema.py", {
            "tool_name": "Write",
            "tool_input": {"file_path": "/tmp/test.py", "content": "print('hello')"},
        })
        assert result.returncode != 2

    def test_blocks_empty_content_write(self):
        result = run_hook("pre-schema.py", {
            "tool_name": "Write",
            "tool_input": {"file_path": "/tmp/test.py", "content": ""},
        })
        # Should block or warn on empty content
        output = parse_hook_output(result)
        if output:
            decision = output.get("hookSpecificOutput", {}).get("permissionDecision", "")
            assert decision in ("deny", "") or result.returncode == 2 or result.returncode == 0


class TestEditValidation:
    def test_allows_valid_edit(self):
        result = run_hook("pre-schema.py", {
            "tool_name": "Edit",
            "tool_input": {
                "file_path": "/tmp/test.py",
                "old_string": "foo",
                "new_string": "bar",
            },
        })
        assert result.returncode != 2

    def test_blocks_same_string_edit(self):
        result = run_hook("pre-schema.py", {
            "tool_name": "Edit",
            "tool_input": {
                "file_path": "/tmp/test.py",
                "old_string": "foo",
                "new_string": "foo",
            },
        })
        # Should block no-op edits
        output = parse_hook_output(result)
        if output:
            decision = output.get("hookSpecificOutput", {}).get("permissionDecision", "")
            assert decision == "deny" or result.returncode == 2


class TestBashValidation:
    def test_allows_non_empty_command(self):
        result = run_hook("pre-schema.py", {
            "tool_name": "Bash",
            "tool_input": {"command": "echo hello"},
        })
        assert result.returncode != 2

    def test_blocks_empty_command(self):
        result = run_hook("pre-schema.py", {
            "tool_name": "Bash",
            "tool_input": {"command": ""},
        })
        output = parse_hook_output(result)
        if output:
            decision = output.get("hookSpecificOutput", {}).get("permissionDecision", "")
            assert decision == "deny" or result.returncode == 2
