---
name: commit
description: Stage and commit changes using conventional commits — analyzes diffs, groups changes, and creates well-structured commit messages
owner: chalk
version: "1.0.0"
metadata-version: "1"
allowed-tools: Bash, Read, Glob, Grep
argument-hint: "[optional: commit message or '-m message']"
---

Stage files and create commits following conventional commit standards. Analyzes the diff to determine the appropriate commit type, scope, and message. Supports granular commits (splitting unrelated changes into separate commits).

## Workflow

1. **Check state** — Run `git status` and `git diff --stat` to see all changes (staged + unstaged + untracked).

2. **Analyze changes** — Read the diff to understand:
   - What files changed and in what areas
   - Whether changes are related or should be split into multiple commits
   - The nature of each change (new feature, bug fix, refactor, docs, test, chore)

3. **Determine commit strategy**:
   - If all changes are related → single commit
   - If changes span unrelated areas → suggest splitting into granular commits
   - Ask the user if unsure about grouping

4. **Stage files** — `git add` the relevant files for each commit. Stage specific files by name, not `git add -A` or `git add .`.

5. **Draft commit message** — Follow conventional commit format:

   ```
   <type>(<scope>): <description>

   [optional body with more detail]
   ```

   Types:
   - `feat` — new feature
   - `fix` — bug fix
   - `refactor` — code restructure without behavior change
   - `docs` — documentation changes
   - `test` — adding or updating tests
   - `chore` — build, config, dependency changes
   - `style` — formatting, whitespace (no logic change)
   - `perf` — performance improvement

   Scope: the area of the codebase affected (e.g., `auth`, `api`, `ui`, `canvas`).

6. **Commit** — Run `git commit -m "<message>"` using a HEREDOC for multi-line messages.

7. **Report** — Show the commit hash and summary. If there are remaining uncommitted changes, note them.

## Rules

- If the user provides a message via `-m` argument, use it as-is (still stage files appropriately)
- Never use `git add -A` or `git add .` — always stage specific files
- Never commit files that look like secrets (`.env`, credentials, API keys, tokens)
- If pre-commit hooks fail, fix the issue and create a NEW commit (never `--amend` unless explicitly asked)
- Never use `--no-verify` to skip hooks
- Keep commit messages concise: subject line under 72 characters
- The body (if needed) should explain WHY, not WHAT (the diff shows what)
- Check recent `git log` to match the repo's existing commit style
- For granular commits, commit in logical order (e.g., refactor before feature)
