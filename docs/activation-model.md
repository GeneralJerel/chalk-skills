# Activation Model

## Purpose

Chalk activation keeps skills provider-agnostic while giving runtimes enough structure to decide when to load them. The activation model lives at the project level, not inside a provider adapter.

- Skills declare reusable activation hints in `SKILL.md`
- Projects declare local routing rules in `.chalk/activation/skills.yaml`
- Runtimes such as Chalk Browser can compile or interpret those rules for a specific agent

This repository defines the contract only. It does not ship a live router or provider-specific hooks.

## Design Rules

- Keep rules deterministic before semantic.
- Keep project-specific routing in the project manifest, not in shared skills.
- Keep action names neutral so they can map to Claude hooks, RuleZ, or another adapter later.
- Default to audit-first rollout for new rule sets.

## Project Manifest Location

Real projects should store the manifest at:

```text
.chalk/activation/skills.yaml
```

An example file for contributors lives at `docs/examples/activation-skills.yaml`.

## Manifest Shape

```yaml
version: "1"
default-mode: audit
rules:
  - id: create-plan-from-user-request
    description: Activate planning when the user explicitly asks for a plan.
    priority: 100
    when:
      events: [user-prompt]
      prompt-contains: [plan, roadmap, approach]
    activate:
      skills: [create-plan]
```

## Supported Matchers

- `events`
  - Neutral runtime events such as `user-prompt`, `session-start`, `pre-tool-use`, `post-tool-use`, `pre-compact`, `session-end`
- `prompt-contains`
  - Plain-language trigger phrases
- `paths-any`
  - Repo paths or globs related to the request or changed files
- `capabilities-any`
  - Capability tags exported by the referenced skills
- `risk-max`
  - Maximum allowed `risk-level` for auto-activation in the rule

Projects may add more matchers later, but they should stay declarative and portable.

## Supported Actions

- `activate.skills`
  - Inject or prioritize one or more named Chalk skills
- `annotate`
  - Add a deterministic note explaining what matched
- `block`
  - Prevent an unsafe automatic activation and require user confirmation

The runtime decides how these actions map to a specific agent. This repository only defines the neutral intent.

## Conflict Resolution

1. Highest `priority` wins.
2. If priorities tie, the rule with the narrower path scope wins. A rule with no `paths-any` matcher is considered the widest possible scope (matches all paths).
3. If rules still tie, prefer the lower `risk-level`.
4. If there is still a tie, activate no new skill and surface an audit note.

## Relationship To Skill Metadata

Skill metadata should stay broad and reusable:

- Good: `capabilities: docs.create, docs.update`
- Good: `activation-artifacts: .chalk/docs/**`
- Avoid: customer names, private repo paths, vendor-only event names

Project manifests are where repo-specific context belongs.

## Rollout Guidance

- Start with `default-mode: audit`
- Review false positives and false negatives before enabling stronger automation
- Keep a fallback `AGENTS.md` path even when activation rules exist
