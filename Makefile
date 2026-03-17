.PHONY: lint format test validate build clean install-global install-dev install-plugin

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

install-global:
	./install.sh --global --max
	@echo "Installed to ~/.claude/"

install-dev:
	@read -p "Install target directory: " dir && ./install.sh "$$dir" --max
	@echo "Done."

install-plugin:
	@echo "Clearing cached cca plugin..."
	@rm -rf ~/.claude/plugins/cache/temp_local_*
	@if [ -d ~/.claude/plugins/marketplaces/claude-agents ]; then \
		echo "Updating marketplace copy..."; \
		rsync -a --delete --exclude='.git' ./ ~/.claude/plugins/marketplaces/claude-agents/; \
	else \
		echo "No marketplace copy found — installing fresh..."; \
		mkdir -p ~/.claude/plugins/marketplaces/claude-agents; \
		rsync -a --exclude='.git' ./ ~/.claude/plugins/marketplaces/claude-agents/; \
	fi
	claude plugin install cca
	@echo "Plugin installed from working tree."

clean:
	rm -rf dist/ __pycache__ .pytest_cache .ruff_cache
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
