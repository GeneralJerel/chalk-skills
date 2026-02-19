# Chalk Skills

Agent skills that ship with [Chalk](https://github.com/chalk-pm) -- the product planning system for AI-enabled teams. These skills teach coding agents (Claude Code, Cursor, etc.) how to work with Chalk's documentation-as-product-truth model.

## What Are Chalk Skills?

Chalk skills are structured markdown instructions that agents read at runtime. Each skill gives an agent a specific capability: bootstrapping docs from a codebase, creating plans, updating documentation, or capturing a project's architecture and design system for style transfer.

Skills follow the `.claude/skills/` convention (Claude Code) and `.cursor/skills/` convention (Cursor) so they're auto-discovered by the agent when referenced or triggered.

## Repository Structure

```
Chalk-skills/
├── README.md
├── skills/                                 # All Chalk agent skills
│   ├── setup-chalk/SKILL.md               # Full .chalk/ folder generation with style transfer
│   ├── setup-docs/SKILL.md                # One-shot profile doc bootstrap
│   ├── create-doc/SKILL.md                # Create new docs in .chalk/docs/
│   ├── update-doc/SKILL.md                # Update existing docs
│   ├── create-plan/SKILL.md               # Create .plan.md files
│   └── product-context-docs/              # Cursor skill with templates
│       ├── SKILL.md
│       ├── agents/openai.yaml
│       └── assets/templates/
│           ├── product-profile.md
│           ├── product-features.md
│           ├── architecture.md
│           ├── tech-stack.md
│           └── sitemap.md
└── agents-md/                              # AGENTS.md files by project
    ├── chalk-browser-AGENTS.md            # Electron app (most comprehensive)
    ├── chalk-cli-template-AGENTS.md       # Template distributed by npx get-chalk
    ├── chalk-design-partners-AGENTS.md    # Design partner repos
    └── chalk-root-AGENTS.md               # Monorepo root
```

## Skill Inventory

### Claude Code Skills (`.claude/skills/`)

| Skill | Purpose | Trigger |
|-------|---------|---------|
| **setup-chalk** | Analyze a repo and generate the full `.chalk/` folder -- product profile, engineering profile, AI profile, design system, tech stack, coding style, brand assets | First-time project setup, style transfer |
| **setup-docs** | One-shot bootstrap that populates all three profile stubs with real codebase content | After `npx get-chalk` or Chalk Browser init |
| **create-doc** | Create a new numbered doc file in `.chalk/docs/` under the correct vertical | "Create a doc about..." |
| **update-doc** | Update an existing doc -- find it, apply changes, bump the "Last updated" line | "Update the engineering profile..." |
| **create-plan** | Create a `.plan.md` file with YAML frontmatter and actionable todos | "Plan the auth feature..." |

### Cursor Skills (`skills/`)

| Skill | Purpose | Trigger |
|-------|---------|---------|
| **product-context-docs** | Create and update `/docs` product context documentation (product profile, features, sitemap, architecture, tech stack) | "Document this product", "bootstrap /docs" |

### AGENTS.md Files

| File | Source | Description |
|------|--------|-------------|
| `chalk-browser-AGENTS.md` | `chalk-browser/` | Most comprehensive -- includes Electron conventions, IPC patterns, and inline plan creation instructions |
| `chalk-cli-template-AGENTS.md` | `chalk-cli/templates/` | Template distributed to user repos via `npx get-chalk` -- generic Chalk conventions with plan creation |
| `chalk-design-partners-AGENTS.md` | `Chalk-DesignPartners/` | Minimal version for design partner repos |
| `chalk-root-AGENTS.md` | Root `/` | Monorepo-level instructions pointing to `.chalk/docs` |

## How Skills Are Structured

Each skill is a folder containing a `SKILL.md` file and optional supporting assets:

```
skill-name/
├── SKILL.md              # Required -- agent instructions
├── reference.md          # Optional -- detailed docs
├── examples.md           # Optional -- usage examples
└── assets/               # Optional -- templates, scripts
    └── templates/
```

### SKILL.md Anatomy

Every `SKILL.md` has YAML frontmatter and a markdown body:

```markdown
---
name: skill-name
description: What this skill does and when to use it
allowed-tools: Read, Write, Glob, Grep
argument-hint: "[what the user passes]"
---

# Skill Title

## Workflow
1. Step one...
2. Step two...
```

- `name` -- Unique identifier (lowercase, hyphens, max 64 chars)
- `description` -- Drives auto-discovery; must include **what** and **when**
- `allowed-tools` -- Restricts the agent to only the tools it needs
- `argument-hint` -- Shows the user what to pass after the slash command

## Where Skills Live

Skills are placed in two locations depending on the agent:

| Agent | Path | Scope |
|-------|------|-------|
| Claude Code | `.chalk/.claude/skills/<skill-name>/` | Per-project |
| Cursor | `.cursor/skills/<skill-name>/` | Per-project |
| Cursor (personal) | `~/.cursor/skills/<skill-name>/` | All projects |

Chalk distributes skills inside `.chalk/.claude/skills/` so they travel with the `.chalk/` folder when it's initialized in a repo.

## The `.chalk/` Folder

Skills produce and maintain the `.chalk/` documentation structure:

```
.chalk/
├── chalk.json                              # Project metadata
├── docs/
│   ├── product/
│   │   └── 0_PRODUCT_PROFILE.md            # What, who, why
│   ├── engineering/
│   │   ├── 0_ENGINEERING_PROFILE.md        # Read-this-first technical overview
│   │   ├── 1_architecture.md               # Process model, data flow, diagrams
│   │   ├── 2_coding-style.md               # Naming, patterns, conventions
│   │   └── 3_techstack.md                  # Every dependency with version + purpose
│   ├── ai/
│   │   └── 0_AI_PROFILE.md                 # Agent orientation, gotchas, quick ref
│   └── design/
│       ├── 0_design-system.md              # Colors, typography, spacing, tokens
│       └── assets/                         # Logos, icons, favicons
└── .claude/
    └── skills/                             # Skills that maintain the above
```

### Doc Conventions

- No YAML frontmatter in docs (plain markdown only)
- First `# Heading` is the document title
- `Last updated: YYYY-MM-DD (<brief note>)` immediately after the title
- Numbered filenames: `0_` for profiles, sequential for additional docs
- Verticals: `product/` (business-facing), `engineering/` (technical), `ai/` (agent-facing), `design/` (visual)

## Design Principles

**Style transfer fidelity** -- An agent reading `.chalk/docs` should be able to write code that looks like it belongs in the codebase, place files in the right directories, use the correct libraries, and match the visual design.

**Concrete over abstract** -- Real hex codes, not "brand green." Real file paths, not "the components folder." Real code snippets from the actual repo.

**Generation creates options, approval creates truth** -- Skills generate documentation; humans review and approve it. Agents never silently merge generated content into project truth.

**Progressive disclosure** -- `SKILL.md` contains the essentials (under 500 lines). Detailed reference material lives in separate files linked from the skill.

## Adding a New Skill

1. Create a folder: `skills/<skill-name>/`
2. Add a `SKILL.md` with frontmatter (`name`, `description`, `allowed-tools`, `argument-hint`)
3. Write the workflow as numbered steps
4. Add templates or scripts in `assets/` if needed
5. Keep `SKILL.md` under 500 lines; use progressive disclosure for detail

### Naming

- Folder and `name` field: `kebab-case`, max 64 characters
- Description: third-person, includes trigger terms
- Filenames inside `.chalk/docs/`: `<number>_<snake_case_slug>.md`

## Related Projects

| Project | Description |
|---------|-------------|
| `chalk-cli` | CLI tool (`npx get-chalk`) that scaffolds `.chalk/` in any repo |
| `chalk-browser` | Electron app for visual product planning and epic management |
| `Chalk-DesignPartners` | Design partner program and feedback collection |

## License

MIT
