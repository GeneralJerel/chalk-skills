#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-skills}"
FAILED=0
COUNT=0

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

get_frontmatter_value() {
  local frontmatter="$1"
  local key="$2"
  printf '%s\n' "$frontmatter" | sed -n "s/^$key:[[:space:]]*//p" | head -n1 | sed 's/^"//;s/"$//'
}

validate_csv_values() {
  local file="$1"
  local field="$2"
  local value="$3"
  local item
  local seen=0

  IFS=',' read -r -a items <<< "$value"
  for item in "${items[@]}"; do
    item="$(trim "$item")"
    if [[ -z "$item" ]]; then
      echo "FAIL $file: $field contains an empty entry"
      FAILED=1
      continue
    fi
    seen=1
  done

  if [[ "$seen" -eq 0 ]]; then
    echo "FAIL $file: $field must contain at least one value"
    FAILED=1
  fi
}

validate_csv_field() {
  local file="$1"
  local field="$2"
  local value="$3"
  local item_validator="${4:-}"

  validate_csv_values "$file" "$field" "$value"

  if [[ -n "$item_validator" ]]; then
    IFS=',' read -r -a items <<< "$value"
    for item in "${items[@]}"; do
      item="$(trim "$item")"
      [[ -z "$item" ]] && continue
      "$item_validator" "$file" "$item"
    done
  fi
}

validate_capability_item() {
  local file="$1"
  local capability="$2"
  if [[ ! "$capability" =~ ^[a-z0-9]+([.-][a-z0-9]+)*$ ]]; then
    echo "FAIL $file: invalid capability '$capability'"
    FAILED=1
  fi
}

validate_activation_event_item() {
  local file="$1"
  local event="$2"
  case "$event" in
    user-prompt|session-start|pre-tool-use|post-tool-use|pre-compact|session-end)
      ;;
    *)
      echo "FAIL $file: unsupported activation event '$event'"
      FAILED=1
      ;;
  esac
}

if [[ ! -d "$ROOT" ]]; then
  echo "ERROR: skills root not found: $ROOT"
  exit 1
fi

for file in "$ROOT"/*/SKILL.md; do
  [[ -f "$file" ]] || continue
  COUNT=$((COUNT + 1))
  dir_name="$(basename "$(dirname "$file")")"

  frontmatter="$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')"
  if [[ -z "$frontmatter" ]]; then
    echo "FAIL $file: missing YAML frontmatter"
    FAILED=1
    continue
  fi

  name="$(get_frontmatter_value "$frontmatter" "name")"
  description="$(get_frontmatter_value "$frontmatter" "description")"
  # v3 uses 'author', v1/v2 use 'owner' — accept both
  owner="$(get_frontmatter_value "$frontmatter" "owner")"
  author="$(get_frontmatter_value "$frontmatter" "author")"
  owner="${owner:-$author}"
  version="$(get_frontmatter_value "$frontmatter" "version")"
  metadata_version="$(get_frontmatter_value "$frontmatter" "metadata-version")"
  capabilities="$(get_frontmatter_value "$frontmatter" "capabilities")"
  activation_intents="$(get_frontmatter_value "$frontmatter" "activation-intents")"
  activation_events="$(get_frontmatter_value "$frontmatter" "activation-events")"
  activation_artifacts="$(get_frontmatter_value "$frontmatter" "activation-artifacts")"
  risk_level="$(get_frontmatter_value "$frontmatter" "risk-level")"

  if [[ -z "$name" || -z "$description" || -z "$owner" || -z "$version" || -z "$metadata_version" ]]; then
    echo "FAIL $file: missing one of required keys (name, description, owner, version, metadata-version)"
    FAILED=1
  fi

  if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "FAIL $file: name must be kebab-case, got '$name'"
    FAILED=1
  fi

  if [[ "$name" != "$dir_name" ]]; then
    echo "FAIL $file: folder '$dir_name' does not match name '$name'"
    FAILED=1
  fi

  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "FAIL $file: version must be semver x.y.z, got '$version'"
    FAILED=1
  fi

  if [[ "$metadata_version" != "1" && "$metadata_version" != "2" && "$metadata_version" != "3" ]]; then
    echo "FAIL $file: metadata-version must be '1', '2', or '3', got '$metadata_version'"
    FAILED=1
  fi

  if [[ "$name" == chalk-* && "$owner" != "chalk" ]]; then
    echo "FAIL $file: chalk-* names are reserved for owner=chalk"
    FAILED=1
  fi

  if [[ "$owner" != "chalk" && "$owner" != "project" ]]; then
    echo "FAIL $file: owner must be chalk or project, got '$owner'"
    FAILED=1
  fi

  if [[ "$metadata_version" == "1" && (-n "$capabilities" || -n "$activation_intents" || -n "$activation_events" || -n "$activation_artifacts" || -n "$risk_level") ]]; then
    echo "FAIL $file: activation metadata requires metadata-version '2' or '3'"
    FAILED=1
  fi

  if [[ "$metadata_version" == "2" || "$metadata_version" == "3" ]]; then
    if [[ -n "$capabilities" ]]; then
      validate_csv_field "$file" "capabilities" "$capabilities" validate_capability_item
    fi

    if [[ -n "$activation_intents" ]]; then
      validate_csv_values "$file" "activation-intents" "$activation_intents"
    fi

    if [[ -n "$activation_events" ]]; then
      validate_csv_field "$file" "activation-events" "$activation_events" validate_activation_event_item
    fi

    if [[ -n "$activation_artifacts" ]]; then
      validate_csv_values "$file" "activation-artifacts" "$activation_artifacts"
    fi

    if [[ -n "$risk_level" && "$risk_level" != "low" && "$risk_level" != "medium" && "$risk_level" != "high" ]]; then
      echo "FAIL $file: risk-level must be low, medium, or high"
      FAILED=1
    fi
  fi

done

# Enforce provider-agnostic skill packages.
provider_specific_files=(
  "$ROOT"/*/agents/openai.yaml
)

for provider_file in "${provider_specific_files[@]}"; do
  [[ -e "$provider_file" ]] || continue
  echo "FAIL $provider_file: provider-specific metadata is not allowed in this repo"
  FAILED=1
done

echo "Validated $COUNT skill(s) under $ROOT"
if [[ "$FAILED" -ne 0 ]]; then
  exit 1
fi

echo "All skill metadata checks passed."
