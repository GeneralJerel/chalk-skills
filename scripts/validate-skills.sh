#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-skills}"
FAILED=0
COUNT=0

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

  name="$(printf '%s\n' "$frontmatter" | sed -n 's/^name:[[:space:]]*//p' | head -n1 | tr -d '"')"
  description="$(printf '%s\n' "$frontmatter" | sed -n 's/^description:[[:space:]]*//p' | head -n1 | tr -d '"')"
  owner="$(printf '%s\n' "$frontmatter" | sed -n 's/^owner:[[:space:]]*//p' | head -n1 | tr -d '"')"
  version="$(printf '%s\n' "$frontmatter" | sed -n 's/^version:[[:space:]]*//p' | head -n1 | tr -d '"')"
  metadata_version="$(printf '%s\n' "$frontmatter" | sed -n 's/^metadata-version:[[:space:]]*//p' | head -n1 | tr -d '"')"

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

  if [[ "$metadata_version" != "1" ]]; then
    echo "FAIL $file: metadata-version must be '1', got '$metadata_version'"
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
