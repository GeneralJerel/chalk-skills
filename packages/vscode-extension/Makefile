# ─────────────────────────────────────────────────
# Skillforge — VS Code Extension
# ─────────────────────────────────────────────────

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Version from package.json
VERSION := $(shell node -p "require('./package.json').version")
NAME    := $(shell node -p "require('./package.json').name")
VSIX    := build/$(NAME)-$(VERSION).vsix

# ─────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: dev
dev: ## Start webpack in watch mode (dev)
	npm run watch

.PHONY: compile
compile: ## Production build
	npm run compile

.PHONY: clean
clean: ## Remove dist/ and build/
	rm -rf dist build

.PHONY: lint
lint: ## Run ESLint
	npm run lint

.PHONY: lint-fix
lint-fix: ## Run ESLint with auto-fix
	npx eslint 'src/**/*.{ts,tsx}' --fix

# ─────────────────────────────────────────────────
# Packaging & Release
# ─────────────────────────────────────────────────

.PHONY: package
package: clean compile ## Build .vsix package
	@mkdir -p build
	npx @vscode/vsce package --out build/
	@echo ""
	@echo "✅ Packaged: $(VSIX)"
	@ls -lh build/*.vsix

.PHONY: install-ext
install-ext: package ## Build and install extension locally
	code --install-extension $(VSIX)
	@echo "✅ Installed $(NAME) v$(VERSION)"

.PHONY: uninstall-ext
uninstall-ext: ## Uninstall extension from VS Code
	code --uninstall-extension $(shell node -p "require('./package.json').publisher + '.' + require('./package.json').name")

.PHONY: publish
publish: clean compile ## Publish to VS Code Marketplace (needs VSCE_PAT)
	npx @vscode/vsce publish
	@echo "✅ Published $(NAME) v$(VERSION)"

.PHONY: publish-ovsx
publish-ovsx: package ## Publish to Open VSX (needs OVSX_PAT)
	npx ovsx publish $(VSIX)
	@echo "✅ Published to Open VSX"

# ─────────────────────────────────────────────────
# Version Management
# ─────────────────────────────────────────────────

.PHONY: bump-patch
bump-patch: ## Bump patch version (0.6.0 → 0.6.1)
	npm version patch --no-git-tag-version
	@echo "✅ Version: $$(node -p "require('./package.json').version")"

.PHONY: bump-minor
bump-minor: ## Bump minor version (0.6.0 → 0.7.0)
	npm version minor --no-git-tag-version
	@echo "✅ Version: $$(node -p "require('./package.json').version")"

.PHONY: bump-major
bump-major: ## Bump major version (0.6.0 → 1.0.0)
	npm version major --no-git-tag-version
	@echo "✅ Version: $$(node -p "require('./package.json').version")"

# ─────────────────────────────────────────────────
# Quality Checks
# ─────────────────────────────────────────────────

.PHONY: check
check: lint compile ## Run all checks (lint + build)
	@echo "✅ All checks passed"

.PHONY: size
size: compile ## Show bundle sizes
	@echo "── Bundle sizes ──"
	@ls -lh dist/extension.js dist/webview.js dist/webview.css 2>/dev/null || true
	@echo ""
	@echo "── Total dist/ ──"
	@du -sh dist/

.PHONY: validate
validate: package ## Validate the .vsix package contents
	@echo "── Package contents ──"
	@npx @vscode/vsce ls 2>/dev/null | head -40
	@echo "..."
	@echo ""
	@echo "── Package size ──"
	@ls -lh build/*.vsix

# ─────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────

.PHONY: open
open: ## Open this folder in VS Code (for debugging)
	code --extensionDevelopmentPath="$$(pwd)"

.PHONY: reset-state
reset-state: ## Reset extension progression state (fresh start)
	@echo "To reset, delete the globalState in VS Code:"
	@echo "  Developer: Reset Extension Global State"

.PHONY: info
info: ## Show project info
	@echo "Name:      $(NAME)"
	@echo "Version:   $(VERSION)"
	@echo "Publisher: $$(node -p "require('./package.json').publisher")"
	@echo "Engine:    $$(node -p "require('./package.json').engines.vscode")"
	@echo "Skills:    $$(find ../../skills -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ') files"

# ─────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@echo ""
	@echo "  Skillforge — VS Code Extension (v$(VERSION))"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
