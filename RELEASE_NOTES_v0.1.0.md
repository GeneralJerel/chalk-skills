# v0.1.0 Release Notes (Draft)

## Summary

Initial open-source foundation release for `chalk-skills`.

This release establishes a provider-agnostic skill contract, validation tooling, contribution workflow, and governance baseline for community contributions.

## Highlights

- Standardized skill metadata contract:
  - `name`, `description`, `owner`, `version`, `metadata-version`
- Added ownership model and SemVer policy
- Added validator (`scripts/validate-skills.sh`) for contract enforcement
- Added skill scaffolder (`scripts/init-skill.sh`) for consistent skill creation
- Added CI workflow to validate skill metadata on PRs/pushes
- Added contribution and governance docs:
  - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`
  - `docs/open-source-scope.md`, `docs/skill-contract.md`, `docs/versioning.md`, `docs/review-checklist.md`
- Added `project-skill-creator` skill for safe project-managed skill creation

## Breaking Changes

- None expected for consumers using skills as markdown definitions.

## Migration Notes

- Provider-specific metadata files are not allowed in this repo.
- Skill definitions should be stored using the unified `.chalk/skills` architecture.
- All core skills are now Chalk-managed (`owner: chalk`).

## Validation

Before publishing changes, run:

```bash
make validate
```

## Follow-ups

- Move from individual CODEOWNERS to org/team ownership once org setup is finalized.
