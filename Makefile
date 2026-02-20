.PHONY: install uninstall lint lint-fix sync-check shellcheck check all clean

# --- Configuration ---
SKILLS_DEST := $(HOME)/.config/opencode/skills
AGENTS_DEST := $(HOME)/.config/opencode/agents

# --- Main Targets ---

## Install all skills and agents globally
install:
	@./install.sh

## Remove all installed skills and agents
uninstall:
	@./install.sh --uninstall

## Run all checks (same as CI)
check: lint sync-check shellcheck
	@echo ""
	@echo "✅ All checks passed"

## Alias for check
all: check

# --- Individual Checks ---

## Run markdownlint
lint:
	@echo "🔍 Markdown Lint"
	@npx -y markdownlint-cli2

## Fix auto-fixable markdownlint issues
lint-fix:
	@npx -y markdownlint-cli2 --fix

## Verify template copies match canonical templates
sync-check:
	@./scripts/check-template-sync.sh

## Run shellcheck on all shell scripts
shellcheck:
	@echo "🔍 ShellCheck"
	@shellcheck scripts/*.sh install.sh
	@echo "✅ ShellCheck passed"

## List all available skills
list:
	@echo "Available Skills"
	@echo "================"
	@for dir in skills/*/; do \
		name=$$(basename "$$dir"); \
		desc=$$(grep '^description:' "$$dir/SKILL.md" 2>/dev/null | head -1 | sed 's/^description: *//'); \
		printf "  %-20s %s\n" "$$name" "$$desc"; \
	done

## Show project stats
stats:
	@echo "Project Stats"
	@echo "============="
	@printf "  Skills:    %d\n" $$(find skills -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
	@printf "  Agents:    %d\n" $$(find agents -name '*.md' | wc -l | tr -d ' ')
	@printf "  Templates: %d\n" $$(find templates -name '*.md' | wc -l | tr -d ' ')
	@printf "  MD Files:  %d\n" $$(find . -name '*.md' -not -path './.git/*' | wc -l | tr -d ' ')

# --- Cleanup ---

## Remove generated files
clean:
	@rm -rf node_modules/

# --- Help ---

## Show this help
help:
	@echo "OpenCode Processing Skills"
	@echo "=========================="
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  install      Install skills + agents globally"
	@echo "  uninstall    Remove installed skills + agents"
	@echo "  check        Run all CI checks (lint + sync + shellcheck)"
	@echo "  lint         Run markdownlint"
	@echo "  lint-fix     Auto-fix markdownlint issues"
	@echo "  sync-check   Verify template copies match canonicals"
	@echo "  shellcheck   ShellCheck on shell scripts"
	@echo "  list         List all available skills"
	@echo "  stats        Show project stats"
	@echo "  clean        Remove generated files"
	@echo "  help         Show this help"
