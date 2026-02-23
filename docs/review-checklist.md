# Review Checklist

Use this checklist for all `chalk-skills` pull requests.

## Contract Checks

- [ ] Skill frontmatter includes required keys (`name`, `description`, `owner`, `version`, `metadata-version`)
- [ ] Skill name is kebab-case and matches folder name
- [ ] Ownership rules are respected (`chalk-*` reserved for `owner: chalk`)
- [ ] No provider-specific metadata files were added

## Behavior Checks

- [ ] Workflow is deterministic and actionable
- [ ] Inputs and outputs are explicit
- [ ] Guardrails prevent accidental destructive behavior
- [ ] Trigger language in `description` is clear

## Repository Checks

- [ ] `skills/skills-index.yaml` is updated when needed
- [ ] `CHANGELOG.md` includes notable changes
- [ ] Docs are updated when contracts or policies changed

## Validation Checks

- [ ] Local run of `scripts/validate-skills.sh` passed
- [ ] CI validation check passed on the PR

## Maintainer Decision

- [ ] Approved for merge
- [ ] Follow-up issues created for deferred improvements
