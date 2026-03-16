# Open Source Scope

## Purpose

`chalk-skills` is the open-source, provider-agnostic skill layer for Chalk workflows. It defines reusable `SKILL.md` skills and validation rules that can evolve independently from Chalk Browser.

## In Scope

- Skill definitions under `skills/<skill-name>/SKILL.md`
- Shared skill metadata/index (`skills/skills-index.yaml`)
- Provider-agnostic activation metadata and project manifest docs
- Skill validation and quality tooling (`scripts/validate-skills.sh`)
- Documentation for skill authoring, ownership, and versioning
- Contributor-facing templates and governance docs

## Out of Scope

- Chalk Browser app source code and internal orchestration internals
- Runtime routing engines, policy daemons, and adapter execution logic
- Closed-source runtime adapters and product-only integrations
- Secrets, API keys, internal telemetry payloads, or private infra config
- Vendor-specific skill metadata formats (provider-specific config files)

## Provider-Agnostic Requirement

This repository must remain provider-agnostic:

- Do not add provider-specific metadata files inside skill packages.
- Keep skill contracts defined by `SKILL.md` frontmatter and markdown body.
- Keep activation manifests declarative and adapter-neutral.
- Keep tooling generic and portable across AI coding environments.

## Relationship to Chalk Browser

Chalk Browser is an Electron app focused on implementation context capture:

- Electron main process + preload bridge + React renderer
- `WebContentsView` tab engine (Electron 30+)
- Capture pipeline in main process with JS injection into tab `webContents`
- IPC via `contextBridge` and `ipcMain.handle`/`ipcRenderer.invoke`
- Atomic UI design (`atoms -> molecules -> organisms`)
- Tailwind CSS, React hooks + IPC, Dexie.js persistence

`chalk-skills` complements this by open-sourcing the AI capability layer (mapping, exploration, flow analysis, reporting) without requiring release of app internals.

## Contribution Boundary Rules

- New core skills should be generally reusable and not hard-code private project assumptions.
- Skills that are project-specific belong in project repos with `owner: project`.
- Names starting with `chalk-` are reserved for `owner: chalk`.
