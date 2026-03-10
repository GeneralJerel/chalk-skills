---
name: create-review
description: Bootstrap a local AI review pipeline and generate a paste-ready review prompt for any provider (Codex, Gemini, GPT, Claude, etc.). Use after creating a handoff or when ready to get an AI code review.
owner: chalk
version: "1.0.0"
metadata-version: "1"
allowed-tools: Bash, Read, Glob, Grep, Write
argument-hint: "[provider] e.g. codex, gemini, or omit for generic"
---

# Create Review

Bootstrap the review pipeline and generate a paste-ready review prompt for any AI reviewer.

## Step 1: Determine the reviewer and session

**Reviewer:** If the user provided `$ARGUMENTS`, sanitize it to a safe kebab-case string (lowercase, strip any characters that aren't alphanumeric or hyphens, collapse multiple hyphens) and use that as the reviewer name (e.g. `codex`, `gemini`, `gpt4`, `claude`). If no argument, use `generic`.

**Session:** Detect from context:
1. If `.reviews/` exists, check for the most recent session directory
2. Otherwise, infer from the current branch name (kebab-case)
3. If on `main`/`master`, ask the user

Store as `{reviewer}` and `{session}`.

## Step 2: Bootstrap the review pipeline

Check if `.reviews/scripts/pack.sh` exists. If not, bootstrap the full pipeline:

```sh
mkdir -p .reviews/scripts .reviews/templates .reviews/sessions
```

### Create `.reviews/scripts/pack.sh`

This script generates a review context pack from git state:

```sh
#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-origin/main}"
SESSION="${2:-adhoc}"
OUTPUT_PATH="${3:-.reviews/sessions/${SESSION}/pack.md}"

# Resolve base ref
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  for candidate in main origin/main master origin/master; do
    if git rev-parse --verify "$candidate" >/dev/null 2>&1; then
      BASE_REF="$candidate"
      break
    fi
  done
fi

MERGE_BASE="$(git merge-base HEAD "$BASE_REF" 2>/dev/null || echo "")"
if [ -z "$MERGE_BASE" ]; then
  MERGE_BASE="$(git rev-list --max-parents=0 HEAD | tail -n 1)"
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

{
  echo "# Review Pack"
  echo
  echo "- Session: \`$SESSION\`"
  echo "- Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "- Base ref: \`$BASE_REF\`"
  echo "- Merge base: \`${MERGE_BASE:0:12}\`"
  echo "- Head: \`$(git rev-parse --short HEAD)\`"
  echo
  echo "## Diff Stat"
  echo '```'
  git diff --stat "$MERGE_BASE"..HEAD 2>/dev/null || echo "(no committed diff)"
  echo '```'
  echo
  echo "## Changed Files"
  CHANGED="$(git diff --name-only "$MERGE_BASE"..HEAD 2>/dev/null || true)"
  if [ -n "$CHANGED" ]; then
    echo "$CHANGED" | while IFS= read -r f; do [ -n "$f" ] && echo "- $f"; done
  else
    echo "- (none)"
  fi
  echo
  echo "## Commit Log"
  echo '```'
  git log --oneline "$MERGE_BASE"..HEAD 2>/dev/null || echo "(no commits ahead of base)"
  echo '```'
  echo
  echo "## Working Tree Status"
  echo '```'
  git status --short
  echo '```'
} > "$OUTPUT_PATH"

echo "PACK_PATH=$OUTPUT_PATH"
```

### Create `.reviews/scripts/render-prompt.sh`

This script combines pack + handoff + reviewer template into a prompt:

```sh
#!/usr/bin/env bash
set -euo pipefail

REVIEWER="${1:?Usage: render-prompt.sh <reviewer> [pack-path] [handoff-path] [output-path]}"
PACK_PATH="${2:-}"
HANDOFF_PATH="${3:-}"
OUTPUT_PATH="${4:-}"
SESSION="${5:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

REVIEWER_TITLE="$(echo "$REVIEWER" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"

if [ -z "$SESSION" ] && [ -f "$ROOT_DIR/.current-session" ]; then
  SESSION="$(cat "$ROOT_DIR/.current-session")"
fi
SESSION="${SESSION:-adhoc}"

[ -z "$PACK_PATH" ] && PACK_PATH="$ROOT_DIR/sessions/$SESSION/pack.md"
[ -z "$HANDOFF_PATH" ] && HANDOFF_PATH="$ROOT_DIR/sessions/$SESSION/handoff.md"
[ -z "$OUTPUT_PATH" ] && OUTPUT_PATH="$ROOT_DIR/sessions/$SESSION/${REVIEWER}.prompt.md"

if [ ! -f "$PACK_PATH" ]; then
  echo "Pack not found at $PACK_PATH. Run pack.sh first." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

{
  echo "# $REVIEWER_TITLE Review Request"
  echo

  # Use provider-specific template if available, else generic
  TEMPLATE="$ROOT_DIR/templates/${REVIEWER}-review.template.md"
  if [ ! -f "$TEMPLATE" ]; then
    TEMPLATE="$ROOT_DIR/templates/generic-review.template.md"
  fi

  if [ -f "$TEMPLATE" ]; then
    cat "$TEMPLATE"
  fi

  echo
  echo "---"
  echo
  echo "## Review Pack"
  cat "$PACK_PATH"

  if [ -f "$HANDOFF_PATH" ]; then
    echo
    echo "---"
    echo
    echo "## Handoff"
    cat "$HANDOFF_PATH"
  fi
} > "$OUTPUT_PATH"

echo "PROMPT_PATH=$OUTPUT_PATH"
```

### Create `.reviews/scripts/copy-prompt.sh`

```sh
#!/usr/bin/env bash
set -euo pipefail

REVIEWER="${1:?Usage: copy-prompt.sh <reviewer> [pack] [handoff] [output] [session]}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

OUTPUT="$(bash "$SCRIPT_DIR/render-prompt.sh" "$@")"
echo "$OUTPUT"

PROMPT_PATH="$(echo "$OUTPUT" | sed -n 's/^PROMPT_PATH=//p' | head -1)"
if [ -z "$PROMPT_PATH" ] || [ ! -f "$PROMPT_PATH" ]; then
  echo "Could not resolve prompt path." >&2
  exit 1
fi

COPIED=0
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < "$PROMPT_PATH" && COPIED=1 && echo "CLIPBOARD=pbcopy"
elif command -v xclip >/dev/null 2>&1; then
  xclip -selection clipboard < "$PROMPT_PATH" && COPIED=1 && echo "CLIPBOARD=xclip"
elif command -v wl-copy >/dev/null 2>&1; then
  wl-copy < "$PROMPT_PATH" && COPIED=1 && echo "CLIPBOARD=wl-copy"
fi

if [ "$COPIED" -eq 0 ]; then
  echo "CLIPBOARD=none (copy manually from $PROMPT_PATH)"
fi
```

### Create `.reviews/templates/generic-review.template.md`

Only create if it does not already exist (preserve user customizations):

```markdown
You are acting as an independent code reviewer.

Task:
- Review the diff only.
- Report defects and risks, not style preferences.

Output format:
1. Findings (highest severity first)
2. Open questions/assumptions
3. Residual risks/testing gaps

Finding schema:
- Severity: P0 (critical) | P1 (high) | P2 (medium) | P3 (low)
- File: <path>:<line>
- Issue: concise summary
- Failure mode: what breaks and when
- Suggested fix: actionable next step

Rules:
- Do not suggest broad refactors unless required for correctness.
- If no blocking issues exist, explicitly state: `No blocking findings`.
```

### Create `.reviews/templates/codex-review.template.md`

Only create if it does not already exist:

```markdown
You are Codex performing an independent PR review.

Primary objective:
- Find real defects and risks in changed lines only.
- Prioritize actionable, high-signal output over style commentary.

Output format (required):
1. `## Verdict`
   - `Block merge: yes|no`
   - `Blocking findings: P0=<n>, P1=<n>`
   - If no P0/P1 findings, include exact text: `No blocking findings`.
2. `## Findings`
   - Markdown table: `ID | Severity | File:Line | Issue | Failure mode | Recommended fix | Confidence`
   - IDs: F-001, F-002, ...
3. `## Testing Gaps`
   - Missing tests that could hide regressions.
4. `## Open Questions`
   - Only unresolved assumptions that affect correctness.

Rules:
- Focus on correctness, security, reliability, and regression risk.
- Do not comment on formatting/import ordering/trivial naming.
- Keep recommendations patch-oriented and specific.
```

### Create `.reviews/templates/gemini-review.template.md`

Only create if it does not already exist:

```markdown
You are Gemini performing an independent PR review.

Primary objective:
- Provide a rigorous risk assessment on changed code.
- Emphasize user impact and merge risk.

Output format (required):
1. `## Executive Summary`
   - 2-4 sentences on overall risk.
   - `Merge recommendation: approve|changes-requested`
   - If no P0/P1 findings, include exact text: `No blocking findings`.
2. `## Findings`
   - Markdown table: `ID | Severity | Category | File:Line | Issue | Impact | Suggested fix | Confidence`
   - IDs: G-001, G-002, ...
   - Categories: Security | Correctness | Performance | Reliability | Testing
3. `## Regression & Testing Gaps`
   - Missing test coverage and risky edge cases.
4. `## Assumptions`
   - Only assumptions that materially affect conclusions.

Rules:
- Review changed lines only.
- No style-only feedback.
- Suggested fixes must be concrete and immediately actionable.
```

### Make scripts executable

```sh
chmod +x .reviews/scripts/pack.sh .reviews/scripts/render-prompt.sh .reviews/scripts/copy-prompt.sh
```

### Create `.reviews/PIPELINE.md`

Write a brief usage guide explaining the pipeline, available scripts, and how to add custom reviewer templates. Refresh this on every run.

## Step 3: Resolve the base branch

1. `git merge-base main HEAD` → if it works, use it
2. Try `origin/main`, then `master`, `origin/master`
3. Store as `{base}`

## Step 4: Check for a handoff

Look for `.reviews/sessions/{session}/handoff.md`. If it exists, it will be included in the prompt. If not, warn the user that no handoff was found and suggest running `/create-handoff` first, but continue anyway.

## Step 5: Generate the review pack

```sh
bash .reviews/scripts/pack.sh "{base}" "{session}" ".reviews/sessions/{session}/pack.md"
```

## Step 6: Generate the review prompt

```sh
bash .reviews/scripts/render-prompt.sh "{reviewer}" \
  ".reviews/sessions/{session}/pack.md" \
  ".reviews/sessions/{session}/handoff.md" \
  ".reviews/sessions/{session}/{reviewer}.prompt.md" \
  "{session}"
```

## Step 7: Copy to clipboard

```sh
bash .reviews/scripts/copy-prompt.sh "{reviewer}" \
  ".reviews/sessions/{session}/pack.md" \
  ".reviews/sessions/{session}/handoff.md" \
  ".reviews/sessions/{session}/{reviewer}.prompt.md" \
  "{session}"
```

## Step 8: Report to the user

Show:
- The prompt file path
- Whether it was copied to clipboard
- The reviewer template used (provider-specific or generic)
- Suggest: paste the prompt into the target model, or run with a different provider (e.g. `/create-review gemini`)

Also mention:
- To add a custom reviewer, create `.reviews/templates/{name}-review.template.md`
- To review with multiple providers: run the skill again with a different argument

## Step 9: Save current session

Write the session name to `.reviews/.current-session` so subsequent runs can pick it up.

## Rules

- Only create template files if they don't already exist — preserve user customizations
- Always refresh scripts (pack.sh, render-prompt.sh, copy-prompt.sh) to latest version
- Always refresh PIPELINE.md to latest version
- Do NOT modify any source code
- If no git changes exist ahead of base, warn the user but still generate (they may have local uncommitted work)
