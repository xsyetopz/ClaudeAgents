.PHONY: lint format test validate build clean install-dev

lint:
	shellcheck install.sh build-plugin.sh uninstall.sh hooks/scripts/_run.sh templates/statusline.sh
	ruff check hooks/scripts/ hooks/user/
	@echo "Validating JSON files..."
	@find . -name '*.json' -not -path './node_modules/*' -not -path './dist/*' -not -path './mcp/node_modules/*' | while read f; do \
		python3 -c "import json; json.load(open('$$f'))" 2>&1 || exit 1; \
	done
	@echo "All lint checks passed."

format:
	ruff format hooks/scripts/ hooks/user/

test:
	pytest tests/ -v

validate: lint test build
	@echo "All validations passed."

build:
	./build-plugin.sh pro
	@echo "Plugin built to dist/claude-agents-plugin/"

install-dev:
	@mkdir -p /tmp/cca-test
	./install.sh /tmp/cca-test --max
	@echo "Dev install to /tmp/cca-test complete."

clean:
	rm -rf dist/ __pycache__ .pytest_cache .ruff_cache
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
