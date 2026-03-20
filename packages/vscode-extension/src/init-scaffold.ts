import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface SampleSkill {
  dir: string;
  content: string;
}

const SAMPLE_SKILLS: SampleSkill[] = [
  {
    dir: 'hello-world',
    content: `---
name: hello-world
description: A simple starter skill that greets the user and explains how skills work
author: project
version: "1.0.0"
metadata-version: "3"
allowed-tools: Read
argument-hint: "[optional: user name]"
tags: starter, onboarding
capabilities: greeting, onboarding
activation-intents: say hello, greet me, how do skills work
risk-level: low
read-only: true
destructive: false
idempotent: true
open-world: false
user-invocable: true
---

# Hello World

A starter skill to demonstrate the Chalk Skills format.

## What to do

1. Greet the user by name if provided
2. Explain that this is a sample skill created by \`Chalk Skills: Init\`
3. Point them to the \`skills/\` folder to create their own

## Example output

> Hey there! I'm the **hello-world** skill. You can find me at \`skills/hello-world/SKILL.md\`.
> Edit me, duplicate me, or delete me and create your own skills!
`,
  },
  {
    dir: 'review-changes',
    content: `---
name: review-changes
description: Review staged git changes and suggest improvements before committing
author: project
version: "1.0.0"
metadata-version: "3"
allowed-tools: Bash, Read, Glob, Grep
argument-hint: "[optional: file path to focus on]"
tags: git, review, quality
capabilities: code-review, git, quality
activation-intents: review my changes, check my code, review before commit
activation-events: pre-commit
risk-level: low
read-only: true
destructive: false
idempotent: true
open-world: false
user-invocable: true
---

# Review Changes

Review the current staged changes and provide feedback.

## Workflow

1. Run \`git diff --cached\` to see staged changes
2. For each changed file:
   - Check for obvious bugs or typos
   - Look for missing error handling
   - Flag any hardcoded secrets or credentials
3. Summarize findings as a short checklist

## Output format

- **Issues**: List anything that should be fixed before committing
- **Suggestions**: Optional improvements that aren't blocking
- **Verdict**: Ship it or fix it
`,
  },
  {
    dir: 'explain-code',
    content: `---
name: explain-code
description: Explain how a file or function works in plain language
author: project
version: "1.0.0"
metadata-version: "3"
allowed-tools: Read, Glob, Grep
argument-hint: "[file path or function name]"
tags: docs, explanation, learning
capabilities: documentation, explanation, onboarding
activation-intents: explain this, how does this work, what does this do
risk-level: low
read-only: true
destructive: false
idempotent: true
open-world: false
user-invocable: true
input-schema:
  type: object
  properties:
    target:
      type: string
      description: File path or function name to explain
  required:
    - target
---

# Explain Code

Read a file or find a function and explain what it does in clear, simple language.

## Workflow

1. If given a file path, read it
2. If given a function name, search for it with Grep
3. Explain the code at a high level first, then walk through key parts
4. Use analogies where helpful
5. Keep it concise — aim for 1-2 short paragraphs

## Rules

- No jargon without explanation
- Start with what it does, then how
- If the code is complex, break it into numbered steps
`,
  },
];

export async function initScaffold(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    vscode.window.showErrorMessage('Open a workspace folder first, then run Chalk Skills: Init.');
    return;
  }

  const root = folders[0].uri.fsPath;
  const skillsDir = path.join(root, 'skills');

  // Check if skills/ already exists with content
  if (fs.existsSync(skillsDir)) {
    const existing = fs.readdirSync(skillsDir).filter(f => {
      const p = path.join(skillsDir, f);
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
    });

    if (existing.length > 0) {
      const choice = await vscode.window.showWarningMessage(
        `Found ${existing.length} existing skill(s) in skills/. Add sample skills anyway?`,
        'Add samples',
        'Cancel',
      );
      if (choice !== 'Add samples') return;
    }
  }

  // Create skills/ and sample skills
  let created = 0;
  for (const sample of SAMPLE_SKILLS) {
    const dir = path.join(skillsDir, sample.dir);
    const file = path.join(dir, 'SKILL.md');

    if (fs.existsSync(file)) continue; // Don't overwrite

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, sample.content, 'utf-8');
    created++;
  }

  if (created === 0) {
    vscode.window.showInformationMessage('All sample skills already exist. Nothing to add.');
    return;
  }

  const openSkill = await vscode.window.showInformationMessage(
    `Created ${created} sample skill(s) in skills/. Open one to see the format?`,
    'Open hello-world',
    'Dismiss',
  );

  if (openSkill === 'Open hello-world') {
    const uri = vscode.Uri.file(path.join(skillsDir, 'hello-world', 'SKILL.md'));
    await vscode.window.showTextDocument(uri);
  }
}

/** Interactive skill creation — prompts for name + description, creates v3 SKILL.md */
export async function createSkill(): Promise<string | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  const root = folders[0].uri.fsPath;

  // Prompt for skill name
  const rawName = await vscode.window.showInputBox({
    prompt: 'Skill name (kebab-case, e.g. deploy-preview)',
    placeHolder: 'my-skill',
    validateInput: (value) => {
      if (!value) return 'Name is required';
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) return 'Use kebab-case: lowercase letters, numbers, and hyphens';
      const dir = path.join(root, 'skills', value);
      if (fs.existsSync(dir)) return `Skill "${value}" already exists`;
      return undefined;
    },
  });
  if (!rawName) return;

  // Prompt for description
  const description = await vscode.window.showInputBox({
    prompt: 'Short description of what this skill does',
    placeHolder: 'Deploy a preview build to staging',
  });
  if (!description) return;

  // Prompt for risk level
  const riskPick = await vscode.window.showQuickPick(
    [
      { label: 'low', description: 'Read-only, no side effects' },
      { label: 'medium', description: 'Modifies files but reversible' },
      { label: 'high', description: 'Destructive or external effects' },
    ],
    { placeHolder: 'Risk level' },
  );
  const risk = riskPick?.label ?? 'low';

  // Prompt for tools
  const toolsPick = await vscode.window.showQuickPick(
    [
      { label: 'Read', picked: true },
      { label: 'Glob', picked: true },
      { label: 'Grep', picked: true },
      { label: 'Write' },
      { label: 'Edit' },
      { label: 'Bash' },
    ],
    { placeHolder: 'Allowed tools', canPickMany: true },
  );
  const tools = toolsPick?.map(t => t.label).join(', ') ?? 'Read';

  // Derive annotations from risk
  const isReadOnly = risk === 'low';
  const isDestructive = risk === 'high';

  const content = `---
name: ${rawName}
description: ${description}
author: project
version: "1.0.0"
metadata-version: "3"
allowed-tools: ${tools}
argument-hint: ""
tags:
capabilities:
activation-intents:
risk-level: ${risk}
read-only: ${isReadOnly}
destructive: ${isDestructive}
idempotent: ${isReadOnly}
open-world: false
user-invocable: true
---

# ${rawName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${description}

## Workflow

1.

## Rules

-

## Output

-
`;

  const skillDir = path.join(root, 'skills', rawName);
  const skillFile = path.join(skillDir, 'SKILL.md');

  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, content, 'utf-8');

  const doc = await vscode.workspace.openTextDocument(skillFile);
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage(`Skill "${rawName}" created at skills/${rawName}/SKILL.md`);
  return skillFile;
}
