# Skill Contract (v1)

## Compatibility Contract

- `metadata-version: "1"` defines the current frontmatter schema.
- All skills under `skills/` must satisfy this schema.
- Breaking schema changes require a new metadata version.

## Required Frontmatter

Every `skills/<skill-name>/SKILL.md` must include:

```yaml
---
name: <kebab-case>
description: <what it does and when to use it>
owner: <chalk|project>
version: "<major.minor.patch>"
metadata-version: "1"
---
```

## Optional Frontmatter

```yaml
allowed-tools: Read, Glob, Write
argument-hint: "[optional arguments]"
```

## Naming Rules

- `name` must be kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`
- `name` must match the folder name exactly
- Names beginning with `chalk-` are reserved for `owner: chalk`

## Ownership Model

- `owner: chalk`: Chalk-managed skill in this repository
- `owner: project`: Project-managed skill in project-level stores

## Versioning Rules

`version` follows SemVer:

- `PATCH` (`x.y.Z`): wording clarifications, non-behavioral edits
- `MINOR` (`x.Y.z`): additive/non-breaking behavior changes
- `MAJOR` (`X.y.z`): breaking behavior or contract changes

## Validation

Run:

```bash
scripts/validate-skills.sh
```

Current validator enforces:

- Required frontmatter keys exist
- Name format and folder-name match
- SemVer format
- Ownership rules
- `metadata-version` value
- Provider-agnostic policy (fails on provider-specific metadata files)
