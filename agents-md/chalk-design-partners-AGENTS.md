<INSTRUCTIONS>
Before planning or writing code in this repo, always read the existing docs in `.chalk/docs` and `README.md` to ground decisions in current product and technical context.

Key files to understand the codebase:
- `.chalk/docs/product/0_PRODUCT_PROFILE.md` -- What the product is and does
- `.chalk/docs/engineering/0_ENGINEERING_PROFILE.md` -- Architecture, tech stack, data flow
- `.chalk/docs/ai/0_AI_PROFILE.md` -- AI-specific context, conventions, gotchas

## Skill: Create a Plan

When the user asks to "create a plan", "make a plan", or similar:

1. Read filenames in `.chalk/.cursor/plans/` (root only) to find the highest numbered plan. New number = highest + 1.
2. Write to `.chalk/.cursor/plans/<number>_<slug>.plan.md` with YAML frontmatter (name, overview, todos) and markdown body (# Title, ## Objective, ## Architecture, ## File Changes, ## Key Design Decisions).
3. All todos start as `pending`. Every plan needs a `# Heading` and `## Objective`.
</INSTRUCTIONS>
