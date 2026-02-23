# Contributing

Thanks for contributing to `chalk-skills`.

## Scope

Contribute provider-agnostic, reusable skills and supporting tooling only. Review scope boundaries in `docs/open-source-scope.md`.

## Before Opening a PR

1. Confirm the skill fits the open-source scope.
2. Follow the skill contract in `docs/skill-contract.md`.
3. Run validation locally:

```bash
scripts/validate-skills.sh
```

4. Keep behavior changes intentional and bump `version` using SemVer.

## Create a New Skill

Use the scaffold script for consistent initialization:

```bash
scripts/init-skill.sh <skill-name> --description "what it does and when to use it" --owner chalk
```

For project-owned skills in external repos:

```bash
scripts/init-skill.sh <skill-name> --description "..." --owner project --path .chalk/skills
```

## Skill Change Requirements

- Keep `name`, folder name, and index entry aligned.
- Include required frontmatter keys.
- Use `owner: chalk` for core repo skills.
- Do not add provider-specific metadata files.
- Keep `SKILL.md` concise and practical.

## Pull Request Guidelines

- Explain what changed and why.
- Include trigger examples for new/updated skills.
- Call out any compatibility impact.
- Update `skills/skills-index.yaml` when adding or renaming skills.
- Update `CHANGELOG.md` for notable user-facing behavior or contract changes.

## Review Criteria

- Contract compliance (`docs/skill-contract.md`)
- Clear, deterministic workflow steps
- Safe defaults and guardrails
- No vendor lock-in in definitions or metadata

Use `docs/review-checklist.md` during review.

## Versioning

Follow `docs/versioning.md` for SemVer bump rules and metadata-version migration policy.

## Maintainers and Review SLA

- Core skill and contract changes require maintainer approval (see `.github/CODEOWNERS`).
- Target first maintainer response within 3 business days.
- Target decision (merge/request changes) within 7 business days for complete PRs.
