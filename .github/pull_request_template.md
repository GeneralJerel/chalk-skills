## Summary

- What changed?
- Why is this needed?

## Change Type

- [ ] New skill
- [ ] Skill update (non-breaking)
- [ ] Skill update (breaking)
- [ ] Docs/process only

## Contract Checklist

- [ ] I followed `docs/skill-contract.md`.
- [ ] I ran `scripts/validate-skills.sh` locally.
- [ ] `name` matches folder name for any changed skill.
- [ ] Required frontmatter keys are present (`name`, `description`, `owner`, `version`, `metadata-version`).
- [ ] No provider-specific metadata files were added.

## Versioning Checklist (for skill behavior changes)

- [ ] I updated `version` in changed `SKILL.md` files using SemVer.
- [ ] I explained why this is patch/minor/major.
- [ ] I updated `skills/skills-index.yaml` when adding/renaming skills.

## Trigger Examples

Provide 1-3 user prompts that should trigger this skill behavior:

1.
2.
3.

## Validation Output

Paste output from:

```bash
scripts/validate-skills.sh
```
