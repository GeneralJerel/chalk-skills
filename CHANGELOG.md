# Changelog

All notable changes to `chalk-skills` will be documented in this file.

The format is inspired by Keep a Changelog and uses SemVer semantics for skill versions.

## [Unreleased]

### Added

- Metadata contract docs: `docs/open-source-scope.md`, `docs/skill-contract.md`
- Activation model spec: `docs/activation-model.md`
- Example project activation manifest: `docs/examples/activation-skills.yaml`
- Provider-agnostic validation script: `scripts/validate-skills.sh`
- Skill index manifest: `skills/skills-index.yaml`
- New skill: `skills/project-skill-creator/SKILL.md`

### Changed

- Standardized frontmatter across all shipped skills (`owner`, `version`, `metadata-version`)
- Extended the frontmatter contract with provider-agnostic activation metadata (`metadata-version: "2"`)
- Updated `README.md` for unified `.chalk/skills` architecture and ownership/version policy
- Updated scaffolding and validation tooling for activation metadata

### Removed

- Provider-specific metadata file: `skills/product-context-docs/agents/openai.yaml`
