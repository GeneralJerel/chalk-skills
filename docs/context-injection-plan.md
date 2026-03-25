# Context Injection Pivot — Implementation Plan

## The Pivot in One Sentence

Chalk goes from **passively tracking skill usage** to **actively making every skill smarter** by feeding it workspace context before it runs — regardless of which skill system authored it.

---

## Current State

The VSCode extension today:
- Detects skill usage via `auto-recorder.ts` (file-open + artifact watchers)
- Parses 81 skills with rich YAML frontmatter (phases, capabilities, activation patterns)
- Gamifies usage with XP, levels, achievements
- Classifies skills into 7 development phases via rules + TF-IDF

**What's missing:** None of this intelligence flows back to the agent. The extension watches but never contributes.

---

## The Problem We're Solving

The SKILL.md standard is gaining real traction — multiple frameworks now ship skills as markdown instructions with YAML frontmatter. But every skill runs blind. When an agent reads a SKILL.md, it has zero awareness of your specific workspace: your test failures, your linting errors, your recent git activity, your project conventions. Skills rediscover this on every invocation.

Some frameworks solve this by embedding bash preambles in each skill — collecting branch names, session state, config — but this approach has three problems:

1. **Reimplementation tax.** Every skill author rebuilds context gathering from scratch.
2. **Limited to CLI signals.** Bash can't access IDE state (diagnostics panel, recent edits, test output).
3. **Invisible to users.** You can't see or tune what context skills are working with.

**Our opportunity:** Be the universal context layer for SKILL.md. Any skill, from any framework, gets richer workspace awareness just by the extension being installed.

---

## Design Principles

1. **Framework-agnostic.** Context injection works with any skill that follows the SKILL.md standard — whether authored by Chalk, by a third-party framework, or hand-written by a developer. No vendor lock-in.

2. **Zero-config value.** Skills that don't declare `context-needs` still get smart defaults based on their phase classification. Install the extension, get better skills.

3. **Opt-in depth.** Skill authors who want fine-grained control can declare exactly which context signals they need. Authors who don't care get sensible defaults.

4. **IDE-native signals.** The core differentiator is access to workspace state that only a VSCode extension can provide — diagnostics, edit activity, test output. These are signals no CLI preamble can replicate.

5. **Transparent.** Users can inspect, tune, and understand exactly what context their skills receive. No black boxes.

---

## Architecture

### High-Level Flow

```
┌────────────────────────────────────────────────────────────┐
│                    VSCode Extension                         │
│                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  Collectors   │    │   Context    │    │   Context    │ │
│  │              │───▶│   Assembler  │───▶│   Writer     │ │
│  │  git, tests, │    │              │    │              │ │
│  │  lint, files  │    │  Filters by  │    │  Writes to   │ │
│  │              │    │  skill needs  │    │.chalk/context/│ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         ▲                                       │         │
│         │                                       ▼         │
│  ┌──────────────┐                      ┌──────────────┐  │
│  │  Auto        │  skill activated     │  .chalk/     │  │
│  │  Recorder    │─────────────────────▶│  context/    │  │
│  │  (existing)  │                      │  <skill>.md  │  │
│  └──────────────┘                      └──────────────┘  │
│                                               │          │
└───────────────────────────────────────────────┼──────────┘
                                                │
                                                ▼
                                    ┌──────────────────┐
                                    │  Any agent reads  │
                                    │  SKILL.md, which  │
                                    │  references       │
                                    │  .chalk/context/  │
                                    └──────────────────┘
```

### New Source Files

```
src/
├── context/
│   ├── context-manager.ts        # Orchestrator — triggers collection on skill activation
│   ├── context-writer.ts         # Writes assembled context to .chalk/context/
│   ├── context-assembler.ts      # Filters collectors by skill's context-needs
│   └── collectors/
│       ├── collector.ts          # Base interface
│       ├── git-collector.ts      # Branch, diff, recent commits, active PR
│       ├── diagnostics-collector.ts  # VSCode Problems panel (lint/type errors)
│       ├── test-collector.ts     # Last test run results, failures
│       ├── activity-collector.ts # Recently edited files, edit frequency
│       ├── plan-collector.ts     # .plan.md files, review status, todos
│       └── convention-collector.ts   # Auto-detected project patterns
├── ...existing files...
```

---

## Implementation Phases

### Phase 1 — Context Collectors (Week 1)

Build the six collector modules. Each implements a common interface:

```typescript
// src/context/collectors/collector.ts
export interface ContextCollector {
  id: string;                           // e.g. 'git-status', 'diagnostics'
  label: string;                        // Human-readable name
  collect(): Promise<ContextSection>;   // Gather data
  isAvailable(): boolean;               // Can this collector run?
}

export interface ContextSection {
  heading: string;        // e.g. "## Git State"
  content: string;        // Markdown body
  freshness: number;      // Timestamp of data collection
  isEmpty: boolean;       // Skip writing if no meaningful data
}
```

**Collector details:**

#### 1. `git-collector.ts`
- `git branch --show-current` → current branch
- `git status --porcelain` → uncommitted changes (files + summary)
- `git log --oneline -10` → recent commit messages
- `git diff --stat HEAD~5..HEAD` → what's changed recently
- `gh pr view --json title,url,state` → active PR (if gh installed)
- Runs via `child_process.execSync` with short timeouts
- Graceful fallback if not a git repo

#### 2. `diagnostics-collector.ts`
**This is the moat — only a VSCode extension can do this.**
- `vscode.languages.getDiagnostics()` → all current errors and warnings
- Groups by severity (Error > Warning > Info)
- Filters to workspace-relevant files only
- Formats as actionable list: `ERROR src/auth.ts:42 — Property 'token' does not exist`

#### 3. `test-collector.ts`
- Reads last test output from common locations:
  - `.test-results/` directory
  - `coverage/lcov.info` or `coverage/coverage-summary.json`
  - Terminal output buffer (VSCode Terminal API)
- Parses pass/fail counts, failing test names, coverage percentages
- Auto-detects test runner (jest, vitest, mocha, pytest, go test, etc.)
- Falls back gracefully if no test runner detected

#### 4. `activity-collector.ts`
- `vscode.workspace.onDidChangeTextDocument` → track edit events
- Maintains in-memory map of `filePath → { editCount, lastEdited }`
- On collection: sorts by recency, reports top 10 recently edited files
- Lightweight — just tracks what you've been touching

#### 5. `plan-collector.ts`
- Scans for `.plan.md`, `*.plan.md` files in workspace
- Also checks `.chalk/docs/` and common plan file locations
- Reads YAML frontmatter + TODO items from plan files
- Extracts: plan name, status, blockers, remaining TODOs
- Framework-agnostic — reads any markdown plan with TODO patterns

#### 6. `convention-collector.ts`
- Samples 20-30 source files to detect patterns:
  - Naming: camelCase vs snake_case vs PascalCase
  - Import style: relative vs absolute vs aliases
  - Test pattern: colocated vs `__tests__/` vs `test/`
  - File structure: feature-based vs layer-based
- Caches results (conventions don't change often)
- Only re-runs on significant workspace changes

### Phase 2 — Skill Frontmatter Extension (Week 1, parallel)

Extend the SKILL.md frontmatter spec with two new optional fields:

```yaml
---
name: review-changes
description: Reviews code changes for bugs and style issues
# ...existing fields...

# NEW: Context injection fields
context-needs:          # What workspace signals this skill wants
  - git-status          # Branch, diff, recent commits
  - diagnostics         # Current lint/type errors
  - test-results        # Last test run outcome
  - recent-activity     # Recently edited files
  - plan-state          # Current plan TODOs and status
  - conventions         # Project coding patterns

benefits-from:          # Which upstream skills enrich this one
  - create-plan
  - create-prd
---
```

**Key design decisions:**
- **Backward compatible.** Skills without `context-needs` still work. They just don't get enriched context. Skills with `context-needs: all` get everything.
- **Generic identifiers.** Context need IDs are not prefixed with `chalk-` or any framework name. They're standard labels (`git-status`, `diagnostics`) that any tool can implement. This keeps the spec adoptable by the broader SKILL.md ecosystem.
- **`benefits-from` is framework-neutral.** It declares upstream skill dependencies by skill name, not by any framework's internal routing. Any orchestrator can read this field.

**Update `types.ts`:**
```typescript
export interface ChalkSkill {
  // ...existing fields...
  contextNeeds: string[];      // NEW
  benefitsFrom: string[];      // NEW
}
```

**Update `skill-loader.ts`:** Parse the new fields during SKILL.md loading.

### Phase 3 — Context Assembler & Writer (Week 2)

#### `context-assembler.ts`
Takes a skill's `context-needs` and runs only the relevant collectors:

```typescript
export class ContextAssembler {
  private collectors: Map<string, ContextCollector>;

  async assembleForSkill(skill: ChalkSkill): Promise<string> {
    const needs = skill.contextNeeds.length > 0
      ? skill.contextNeeds
      : this.getDefaultNeedsForPhase(skill.phase);

    const sections: ContextSection[] = [];

    // Run collectors in parallel for speed
    const results = await Promise.allSettled(
      needs.map(async (need) => {
        const collector = this.collectors.get(need);
        if (collector?.isAvailable()) {
          return collector.collect();
        }
        return null;
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && !result.value.isEmpty) {
        sections.push(result.value);
      }
    }

    return this.formatAsMarkdown(skill, sections);
  }

  // If no context-needs declared, infer from phase
  private getDefaultNeedsForPhase(phase: Phase): string[] {
    const defaults: Record<Phase, string[]> = {
      foundation:    ['conventions', 'plan-state'],
      design:        ['plan-state', 'recent-activity'],
      architecture:  ['git-status', 'conventions', 'plan-state'],
      engineering:   ['git-status', 'diagnostics', 'test-results'],
      development:   ['git-status', 'diagnostics', 'test-results', 'recent-activity'],
      launch:        ['git-status', 'test-results', 'plan-state'],
      reference:     ['conventions'],
      uncategorized: ['git-status'],
    };
    return defaults[phase] ?? ['git-status'];
  }
}
```

**Phase-based defaults are the key UX insight.** Even skills that don't declare `context-needs` get smart defaults based on their phase. An engineering-phase skill automatically gets git status + diagnostics + test results. A design-phase skill gets plan state + recent activity. The phase classification system you already built now has a *purpose*.

#### `context-writer.ts`
Writes the assembled context to disk:

```typescript
export class ContextWriter {
  async write(skillId: string, contextMarkdown: string): Promise<string> {
    const contextDir = path.join(workspaceRoot, '.chalk', 'context');
    await fs.mkdir(contextDir, { recursive: true });

    // Write skill-specific context
    const filePath = path.join(contextDir, `${skillId}.md`);
    await fs.writeFile(filePath, contextMarkdown, 'utf-8');

    // Also write/update generic workspace context
    const genericPath = path.join(contextDir, 'workspace.md');
    await this.writeGenericContext(genericPath);

    return filePath;
  }
}
```

**Output format (plain markdown — any agent can read this):**
```markdown
# Workspace Context
Generated: 2026-03-23T10:15:00Z
Skill: review-changes | Phase: engineering

---

## Git State
Branch: feature/auth-redesign (3 commits ahead of main)
Uncommitted: 3 files modified
  - src/auth.ts (M)
  - src/middleware.ts (M)
  - tests/auth.test.ts (M)
Recent commits:
  - abc1234 refactor auth to use JWT (2h ago)
  - def5678 add middleware tests (4h ago)
  - ghi9012 update auth types (yesterday)

## Current Issues
Errors (2):
  - src/auth.ts:42 — Property 'token' does not exist on type 'Session'
  - src/auth.ts:87 — Argument of type 'string' is not assignable to 'AuthToken'
Warnings (1):
  - src/middleware.ts:18 — 'oldAuth' is declared but never used

## Test Results
Last run: 2 minutes ago
Result: 41 passed, 2 failed, 0 skipped
Failing:
  - tests/auth.test.ts > "should validate JWT expiry"
  - tests/auth.test.ts > "should reject malformed tokens"
Coverage: 78% (down from 82% on main)

## Recent Activity
Most edited today: src/auth.ts (12 saves), src/middleware.ts (8 saves)
```

### Phase 4 — Wire Into Auto-Recorder (Week 2)

Modify `auto-recorder.ts` to trigger context assembly on skill activation:

```typescript
export interface AutoRecorderCallbacks {
  onSkillUsed: (skillId: string, trigger: 'file-read' | 'artifact-change') => void;
  onContextNeeded: (skill: ChalkSkill) => void;   // NEW
}
```

Modify `extension.ts` activation:

```typescript
autoRecorder = new AutoRecorder({
  onSkillUsed: (skillId, trigger) => {
    handleRecordUsage(context, skillId, true);
    // ...existing XP logic...
  },
  onContextNeeded: async (skill) => {
    const contextManager = getContextManager();
    const filePath = await contextManager.assembleAndWrite(skill);
    vscode.window.setStatusBarMessage(`Context assembled for ${skill.name}`, 3000);
  },
});
```

### Phase 5 — Skill Workflow Integration (Week 3)

For context to reach the agent, skills need to know where to find it. Two approaches, both supported:

#### Approach A: Convention-based (zero-config)
Add a standard convention to the SKILL.md spec: skills check for `.chalk/context/<skill-id>.md` or `.chalk/context/workspace.md` at the start of their workflow. Update skill scaffold template:

```markdown
## Workflow
1. **Read workspace context** (if available):
   Read `.chalk/context/<this-skill-id>.md` for current workspace state.
   If the file doesn't exist, proceed without it.
2. [rest of workflow...]
```

#### Approach B: Env-var bridge
For skills that use bash preambles, also generate a lightweight env file:

```bash
# .chalk/context/env.sh
# Auto-generated workspace context — source this in your preamble
export CONTEXT_BRANCH="feature/auth-redesign"
export CONTEXT_ERRORS="2"
export CONTEXT_TEST_STATUS="2 failing"
export CONTEXT_FILE=".chalk/context/workspace.md"
```

Any framework's preamble can source this with one line. No Chalk-specific coupling.

### Phase 6 — Context Freshness & Background Updates (Week 3)

Context needs to be fresh. Two strategies:

**On-demand (default):** Context is assembled when a skill is activated (file-open detection). This adds ~200-500ms latency but guarantees freshness.

**Background mode (opt-in via settings):** A background loop updates `.chalk/context/workspace.md` every N seconds.

```typescript
// Settings contribution
"chalkSkills.context.mode": {
  "type": "string",
  "enum": ["on-demand", "background"],
  "default": "on-demand",
  "description": "When to assemble workspace context"
},
"chalkSkills.context.backgroundIntervalSeconds": {
  "type": "number",
  "default": 30,
  "description": "Seconds between background context updates (background mode only)"
}
```

### Phase 7 — Webview: Context Inspector Panel (Week 4)

Add a new tab to the existing webview dashboard: **Context Inspector**.

Shows:
- Current assembled context (rendered markdown)
- Which collectors ran and their freshness timestamps
- Toggle to enable/disable individual collectors
- Preview of what a specific skill would receive
- History of context snapshots (last 10)

This is the UX differentiator. Users can see exactly what context their skills are working with. No CLI-only tool can offer this transparency.

**New message types:**
```typescript
| type: 'context:loaded'; payload: { skillId: string; markdown: string; collectors: CollectorStatus[] }
| type: 'context:request'; payload: { skillId: string }
```

### Phase 8 — Plugin Architecture for Custom Collectors (Week 4+)

Allow third parties to register custom collectors:

```typescript
// Extension API surface
export interface ContextCollectorContribution {
  id: string;
  label: string;
  collect: () => Promise<ContextSection>;
  isAvailable: () => boolean;
}

// Other extensions can contribute collectors via:
const chalkApi = vscode.extensions.getExtension('chalk.chalk-skills')?.exports;
chalkApi?.registerCollector({
  id: 'docker-status',
  label: 'Docker Containers',
  collect: async () => ({ ... }),
  isAvailable: () => true,
});
```

This makes the context system truly extensible. A Docker extension could register a collector that reports running containers. A database extension could report migration status. The collector interface is the extension point — anyone can plug in.

---

## Naming & Branding

### Current State
- Repo: `chalk-skills`
- Extension: `chalkSkills.*` (commands, settings, storage keys)
- Skill prefix: `chalk-` reserved but only used by 1 of 81 skills
- Internal references: "Chalk Skills" throughout webview UI

### Recommendation

**Keep "Chalk" as the product brand** but position it as infrastructure, not a walled garden:

1. **Extension display name:** "Chalk — Context-Aware Skills" or "Chalk Context Engine"
2. **Collector IDs are generic:** `git-status`, `diagnostics`, `test-results` — no `chalk-` prefix. Any tool implementing the spec uses the same identifiers.
3. **Context file path `.chalk/context/`:** This is Chalk's namespace on disk, which is appropriate. The context *format* is plain markdown that any agent can read.
4. **`context-needs` field names are generic:** The spec is designed to be adopted by any SKILL.md-compatible system. If the broader ecosystem wants to standardize on these context IDs, nothing in the spec ties them to Chalk.
5. **The `chalk-` skill name prefix:** Keep the reservation for Chalk-managed skills (namespace scoping). Only 1 of 81 skills uses it today, which is correct — most skills should have descriptive action-based names.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types.ts` | Modify | Add `contextNeeds`, `benefitsFrom` to ChalkSkill interface |
| `src/skill-loader.ts` | Modify | Parse new frontmatter fields |
| `src/auto-recorder.ts` | Modify | Add `onContextNeeded` callback |
| `src/extension.ts` | Modify | Wire context manager into activation flow |
| `src/context/collector.ts` | New | Base collector interface and types |
| `src/context/git-collector.ts` | New | Git state collection |
| `src/context/diagnostics-collector.ts` | New | VSCode diagnostics (the moat) |
| `src/context/test-collector.ts` | New | Test results parsing |
| `src/context/activity-collector.ts` | New | File edit tracking |
| `src/context/plan-collector.ts` | New | Plan file parsing |
| `src/context/convention-collector.ts` | New | Code pattern detection |
| `src/context/context-assembler.ts` | New | Collector orchestration + phase defaults |
| `src/context/context-writer.ts` | New | File output |
| `src/context/context-manager.ts` | New | Top-level orchestrator |
| `package.json` | Modify | New settings contributions for context mode |
| `webview/components/ContextInspector.tsx` | New | Context inspector UI panel |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Context file stale when agent reads it | Agent works with outdated info | Freshness timestamp in file header + on-demand mode as default |
| Collectors slow down skill activation | UX latency on every skill use | Parallel collection via `Promise.allSettled`, 500ms timeout per collector, cached results |
| `.chalk/context/` pollutes git | Unwanted files committed to repo | Auto-add to `.gitignore` on first context write |
| Skills don't read context file | No value delivered | Phase-based defaults + update scaffold template to include context read step |
| Other frameworks ignore `context-needs` | Spec stays Chalk-only | Keep field names generic, publish spec as standalone doc, propose to SKILL.md community |
| Too much context overwhelms agent | Token waste, slower responses | `context-needs` limits scope; hard cap at 500 lines; priority ordering within sections |
| Custom collector from untrusted extension | Security risk | Collectors run in extension host sandbox; output is plain text; no code execution |

---

## Success Metrics

**Week 2 (MVP):** Git + diagnostics collectors work. Context file is written on skill activation. At least one skill reads it and produces measurably better output.

**Week 4 (Beta):** All 6 collectors work. Context Inspector in webview. 10+ skills updated with `context-needs`. Users can toggle individual collectors.

**Week 8 (V1):** A/B evidence that skills with context produce better results than without. Community skill authors adopting `context-needs` field. At least one third-party framework references the context spec.

---

## Immediate Next Steps

1. Create `src/context/` directory and base collector interface
2. Build `git-collector.ts` and `diagnostics-collector.ts` (highest value, most differentiating)
3. Add `contextNeeds` / `benefitsFrom` to type definitions and skill parser
4. Wire context assembly into auto-recorder's skill activation path
5. Update one skill (`review-changes`) to read context as proof of concept
6. Add `.chalk/context/` to default `.gitignore` generation
