#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  scripts/init-skill.sh <skill-name> --description "..." [options]

Required:
  <skill-name>                  Kebab-case skill name
  --description <text>          Skill description (what + when to use)

Options:
  --owner <chalk|project>       Skill owner (default: project)
  --version <x.y.z>             Initial version (default: 1.0.0)
  --metadata-version <n>        Frontmatter schema version (default: 1)
  --allowed-tools <text>        Optional allowed-tools field
  --argument-hint <text>        Optional argument-hint field
  --path <dir>                  Root path for skills (default: skills)

Examples:
  scripts/init-skill.sh site-map --description "Create site maps from captured flow context" --owner chalk --allowed-tools "Read, Glob, Write"
  scripts/init-skill.sh my-team-helper --description "Project helper skill" --owner project --path .chalk/skills
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

NAME="$1"
shift
OWNER="project"
VERSION="1.0.0"
METADATA_VERSION="1"
DESCRIPTION=""
ALLOWED_TOOLS=""
ARGUMENT_HINT=""
ROOT_PATH="skills"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner)
      OWNER="${2:-}"
      shift 2
      ;;
    --version)
      VERSION="${2:-}"
      shift 2
      ;;
    --metadata-version)
      METADATA_VERSION="${2:-}"
      shift 2
      ;;
    --description)
      DESCRIPTION="${2:-}"
      shift 2
      ;;
    --allowed-tools)
      ALLOWED_TOOLS="${2:-}"
      shift 2
      ;;
    --argument-hint)
      ARGUMENT_HINT="${2:-}"
      shift 2
      ;;
    --path)
      ROOT_PATH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$DESCRIPTION" ]]; then
  echo "ERROR: --description is required"
  exit 1
fi

if [[ ! "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "ERROR: skill name must be kebab-case"
  exit 1
fi

if [[ "$OWNER" != "chalk" && "$OWNER" != "project" ]]; then
  echo "ERROR: --owner must be 'chalk' or 'project'"
  exit 1
fi

if [[ "$OWNER" == "project" && "$NAME" == chalk-* ]]; then
  echo "ERROR: names starting with 'chalk-' are reserved for owner=chalk"
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: --version must be SemVer (x.y.z)"
  exit 1
fi

SKILL_DIR="$ROOT_PATH/$NAME"
SKILL_FILE="$SKILL_DIR/SKILL.md"

if [[ -e "$SKILL_DIR" ]]; then
  echo "ERROR: skill path already exists: $SKILL_DIR"
  exit 1
fi

mkdir -p "$SKILL_DIR"

{
  echo "---"
  echo "name: $NAME"
  echo "description: $DESCRIPTION"
  echo "owner: $OWNER"
  echo "version: \"$VERSION\""
  echo "metadata-version: \"$METADATA_VERSION\""
  if [[ -n "$ALLOWED_TOOLS" ]]; then
    echo "allowed-tools: $ALLOWED_TOOLS"
  fi
  if [[ -n "$ARGUMENT_HINT" ]]; then
    echo "argument-hint: \"$ARGUMENT_HINT\""
  fi
  echo "---"
  echo
  echo "# $NAME"
  echo
  echo "## Overview"
  echo
  echo "$DESCRIPTION"
  echo
  echo "## Workflow"
  echo
  echo "1. Resolve user intent and expected output."
  echo "2. Validate required inputs before making changes."
  echo "3. Execute deterministic steps and keep side effects minimal."
  echo "4. Confirm output paths and summarize generated artifacts."
  echo
  echo "## Inputs"
  echo
  echo "- Required: define required inputs here"
  echo "- Optional: define optional inputs here"
  echo
  echo "## Output"
  echo
  echo "- Define generated files or actions"
  echo
  echo "## Guardrails"
  echo
  echo "- Default to safe, non-destructive behavior."
  echo "- Do not overwrite existing files without explicit user confirmation."
  echo "- Keep behavior provider-agnostic."
} > "$SKILL_FILE"

# Update index only for Chalk-managed skills in canonical repo path.
if [[ "$ROOT_PATH" == "skills" && "$OWNER" == "chalk" && -f "skills/skills-index.yaml" ]]; then
  if rg -n "^\s*- name: $NAME$" skills/skills-index.yaml >/dev/null 2>&1; then
    echo "INFO: skills/skills-index.yaml already contains $NAME"
  else
    cat >> skills/skills-index.yaml <<INDEX
  - name: $NAME
    path: skills/$NAME/SKILL.md
    owner: $OWNER
    version: \"$VERSION\"
INDEX
    echo "INFO: appended $NAME to skills/skills-index.yaml"
  fi
fi

echo "Created $SKILL_FILE"
