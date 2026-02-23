# Versioning Policy

This repo uses two version layers:

- Skill behavior version: `version` in each `SKILL.md` (SemVer)
- Skill metadata schema version: `metadata-version` in `SKILL.md`

## Skill `version` (SemVer)

Use semantic versioning for behavior:

- `PATCH` (`x.y.Z`): non-behavioral wording fixes, typo corrections, clarification only
- `MINOR` (`x.Y.z`): additive steps, new optional inputs, non-breaking flow improvements
- `MAJOR` (`X.y.z`): breaking trigger changes, breaking workflow contract changes, output contract changes

## `metadata-version`

Use this only for frontmatter schema changes.

- Current value: `"1"`
- Bump only when required fields or field semantics change
- Schema migrations must include:
  - migration notes
  - validator update
  - changelog entry

## Release Discipline

For any PR changing skill behavior:

1. Bump the affected skill `version`.
2. Explain why the bump is patch/minor/major.
3. Update `skills/skills-index.yaml` if name/path/version changes.
4. Add an entry under `CHANGELOG.md`.

## Examples

- Clarify wording in `setup-docs` rules only: `1.2.3 -> 1.2.4`
- Add a new optional output section in `create-doc`: `1.2.3 -> 1.3.0`
- Change `create-plan` output naming contract: `1.2.3 -> 2.0.0`
