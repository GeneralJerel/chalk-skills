# Changelog

All notable changes to `chalk-skills` will be documented in this file.

The format is inspired by Keep a Changelog and uses SemVer semantics for skill versions.

## [Unreleased]

### Added

- Metadata contract docs: `docs/open-source-scope.md`, `docs/skill-contract.md`
- Provider-agnostic validation script: `scripts/validate-skills.sh`
- Skill index manifest: `skills/skills-index.yaml`
- New skill: `skills/project-skill-creator/SKILL.md`

### Changed

- Standardized frontmatter across all shipped skills (`owner`, `version`, `metadata-version`)
- Updated `README.md` for unified `.chalk/skills` architecture and ownership/version policy

### Removed

- Provider-specific metadata file: `skills/product-context-docs/agents/openai.yaml`
