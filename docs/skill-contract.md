# Skill Contract (v2)

## Compatibility Contract

- `metadata-version: "2"` defines the current frontmatter schema.
- `metadata-version: "1"` remains valid for legacy skills that do not declare activation metadata.
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
metadata-version: "2"
---
```

## Optional Frontmatter

```yaml
allowed-tools: Read, Glob, Write
argument-hint: "[optional arguments]"
capabilities: docs.create, docs.update
activation-intents: create doc, update doc
activation-events: user-prompt
activation-artifacts: .chalk/docs/**
risk-level: low
```

## Naming Rules

- `name` must be kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`
- `name` must match the folder name exactly
- Names beginning with `chalk-` are reserved for `owner: chalk`

## Ownership Model

- `owner: chalk`: Chalk-managed skill in this repository
- `owner: project`: Project-managed skill in project-level stores

## Activation Metadata

`metadata-version: "2"` adds optional activation hints that stay provider-agnostic and can be consumed by Chalk Browser or another adapter later.

- `capabilities`
  - Comma-separated canonical capability tags
  - Use lowercase dot namespaces such as `docs.create` or `review.orchestrate`
- `activation-intents`
  - Comma-separated user-facing trigger phrases
  - Keep them broad and reusable; project-specific routing belongs in project manifests
- `activation-events`
  - Comma-separated event names from this set:
    - `user-prompt`
    - `session-start`
    - `pre-tool-use`
    - `post-tool-use`
    - `pre-compact`
    - `session-end`
- `activation-artifacts`
  - Comma-separated repo paths or globs touched by the skill, such as `.chalk/docs/**`
- `risk-level`
  - One of `low`, `medium`, `high`
  - Signals the skill's side-effect profile, not a security guarantee

These fields are hints only. Project-specific activation rules live outside the skill in the neutral project manifest documented in `docs/activation-model.md`.

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
- `metadata-version` value (`1` or `2`)
- `metadata-version: "2"` activation metadata format when present
- Provider-agnostic policy (fails on provider-specific metadata files)
