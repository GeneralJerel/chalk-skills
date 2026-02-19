<!-- chalk:start -->
<INSTRUCTIONS>
Before planning or writing code in this repo, always read the existing docs in `.chalk/docs` and `README.md` to ground decisions in current product and technical context. If `.chalk/docs` does not exist yet, create it using the repo's standard structure or note the gap before proceeding.

Key files to understand the codebase:
- `.chalk/docs/product/0_PRODUCT_PROFILE.md` -- What the product is and does
- `.chalk/docs/engineering/0_ENGINEERING_PROFILE.md` -- Architecture, tech stack, data flow
- `.chalk/docs/ai/0_AI_PROFILE.md` -- AI-specific context, conventions, gotchas

Critical conventions:
- If `.chalk/docs` is updated, keep `0_PRODUCT_PROFILE`, `0_ENGINEERING_PROFILE`, and `0_AI_PROFILE` in sync

## Skill: Create a Plan

When the user asks to "create a plan", "make a plan", "write a plan", or similar:

### 1. Determine the next plan number
Read filenames in `.chalk/.cursor/plans/` (root level only, not subfolders). Find the highest numeric prefix. The new plan number = highest + 1. If no numbered files exist, start from 1.

### 2. Write the plan file
Save to `.chalk/.cursor/plans/<number>_<snake_case_slug>.plan.md` using this format:

```
---
name: Short Plan Title
overview: One-sentence description of what this plan delivers and why.
todos:
  - id: kebab-case-id
    content: "Brief task description"
    status: pending
  - id: another-task
    content: "Another task"
    status: pending
---

# Plan Title

## Objective

1-2 paragraphs describing the goal. The first paragraph is extracted by
the parser as the plan's objective summary (up to 200 chars).

## Architecture

Technical approach. Include a Mermaid diagram if multi-component.

## File Changes

### 1. Component or Module Name

What changes, why, and key details.

## Key Design Decisions

- **Decision** -- Rationale
```

### Rules
- **Frontmatter is required** for new plans. It must include `name`, `overview`, and `todos`.
- **Todos** use `status: pending | in_progress | done`. Start all as `pending`.
- **Every plan must have** a `# Heading` and a `## Objective` section in the markdown body.
- New plans go into the **root** of `.chalk/.cursor/plans/` (unsorted backlog), not a subfolder.
- After writing, confirm the filename and give a brief summary.
</INSTRUCTIONS>
<!-- chalk:end -->
