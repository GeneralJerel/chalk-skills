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
  --metadata-version <n>        Frontmatter schema version (default: 2)
  --allowed-tools <text>        Optional allowed-tools field
  --argument-hint <text>        Optional argument-hint field
  --capabilities <text>         Optional capability tags (comma-separated)
  --activation-intents <text>   Optional trigger phrases (comma-separated)
  --activation-events <text>    Optional event names (comma-separated)
  --activation-artifacts <text> Optional repo paths or globs (comma-separated)
  --risk-level <low|medium|high> Optional side-effect hint
  --path <dir>                  Root path for skills (default: skills)

Examples:
  scripts/init-skill.sh site-map --description "Create site maps from captured flow context" --owner chalk --allowed-tools "Read, Glob, Write"
  scripts/init-skill.sh create-adr --description "Create ADR docs when the user asks for architecture decisions" --owner chalk --capabilities "docs.create,architecture.adr" --activation-intents "create adr,write architecture decision" --activation-events "user-prompt" --activation-artifacts "docs/adr/**" --risk-level low
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
METADATA_VERSION="2"
DESCRIPTION=""
ALLOWED_TOOLS=""
ARGUMENT_HINT=""
CAPABILITIES=""
ACTIVATION_INTENTS=""
ACTIVATION_EVENTS=""
ACTIVATION_ARTIFACTS=""
RISK_LEVEL=""
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
    --capabilities)
      CAPABILITIES="${2:-}"
      shift 2
      ;;
    --activation-intents)
      ACTIVATION_INTENTS="${2:-}"
      shift 2
      ;;
    --activation-events)
      ACTIVATION_EVENTS="${2:-}"
      shift 2
      ;;
    --activation-artifacts)
      ACTIVATION_ARTIFACTS="${2:-}"
      shift 2
      ;;
    --risk-level)
      RISK_LEVEL="${2:-}"
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

if [[ "$METADATA_VERSION" != "1" && "$METADATA_VERSION" != "2" ]]; then
  echo "ERROR: --metadata-version must be '1' or '2'"
  exit 1
fi

if [[ -n "$RISK_LEVEL" && "$RISK_LEVEL" != "low" && "$RISK_LEVEL" != "medium" && "$RISK_LEVEL" != "high" ]]; then
  echo "ERROR: --risk-level must be one of low, medium, high"
  exit 1
fi

if [[ "$METADATA_VERSION" != "2" && (-n "$CAPABILITIES" || -n "$ACTIVATION_INTENTS" || -n "$ACTIVATION_EVENTS" || -n "$ACTIVATION_ARTIFACTS" || -n "$RISK_LEVEL") ]]; then
  echo "ERROR: activation metadata requires --metadata-version 2"
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
  if [[ -n "$CAPABILITIES" ]]; then
    echo "capabilities: \"$CAPABILITIES\""
  fi
  if [[ -n "$ACTIVATION_INTENTS" ]]; then
    echo "activation-intents: \"$ACTIVATION_INTENTS\""
  fi
  if [[ -n "$ACTIVATION_EVENTS" ]]; then
    echo "activation-events: \"$ACTIVATION_EVENTS\""
  fi
  if [[ -n "$ACTIVATION_ARTIFACTS" ]]; then
    echo "activation-artifacts: \"$ACTIVATION_ARTIFACTS\""
  fi
  if [[ -n "$RISK_LEVEL" ]]; then
    echo "risk-level: $RISK_LEVEL"
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
