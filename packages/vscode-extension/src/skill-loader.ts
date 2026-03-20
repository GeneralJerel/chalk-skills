import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ChalkSkill, InputSchema, RiskLevel, SkillAnnotations, riskToRarity } from './types';
import { classifyPhase } from './phase-classifier';
import { loadPhaseIndex } from './skill-indexer';

function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function toDisplayName(kebab: string): string {
  return kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Derive behavioral annotations from explicit fields or fall back to risk-level heuristics */
function parseAnnotations(data: Record<string, unknown>, riskLevel: RiskLevel): SkillAnnotations {
  // Explicit annotations take priority
  if (
    data['read-only'] !== undefined ||
    data['destructive'] !== undefined ||
    data['idempotent'] !== undefined ||
    data['open-world'] !== undefined
  ) {
    return {
      readOnly: data['read-only'] === true,
      destructive: data['destructive'] === true,
      idempotent: data['idempotent'] === true || data['idempotent'] === undefined, // default true
      openWorld: data['open-world'] === true,
    };
  }

  // Fall back: infer from risk-level for v1/v2 skills
  switch (riskLevel) {
    case 'high':
      return { readOnly: false, destructive: true, idempotent: false, openWorld: true };
    case 'medium':
      return { readOnly: false, destructive: false, idempotent: false, openWorld: false };
    case 'low':
      return { readOnly: true, destructive: false, idempotent: true, openWorld: false };
    default:
      return { readOnly: false, destructive: false, idempotent: true, openWorld: false };
  }
}

/** Parse optional input-schema from frontmatter */
function parseInputSchema(data: Record<string, unknown>): InputSchema | undefined {
  const raw = data['input-schema'];
  if (!raw || typeof raw !== 'object') return undefined;

  const schema = raw as Record<string, unknown>;
  if (schema.type !== 'object') return undefined;

  return {
    type: 'object',
    properties: schema.properties as InputSchema['properties'],
    required: Array.isArray(schema.required) ? schema.required as string[] : undefined,
  };
}

function parseSkillFile(filePath: string, phaseIndex: Map<string, string>): ChalkSkill | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const name = data.name as string;
    if (!name) return null;

    const riskLevel = (data['risk-level'] as RiskLevel) ?? 'unknown';
    const mv = data['metadata-version'];
    const metadataVersion: 1 | 2 | 3 = mv === '3' ? 3 : mv === '2' ? 2 : 1;

    const indexPhase = phaseIndex.get(name);
    const phase = indexPhase
      ? (indexPhase as ChalkSkill['phase'])
      : classifyPhase(name, parseCommaSeparated(data.capabilities));

    // author: v3 uses "author", v1/v2 used "owner", fall back to "chalk"
    const author = (data.author as string) ?? (data.owner as string) ?? 'chalk';

    return {
      id: name,
      name: toDisplayName(name),
      description: (data.description as string) ?? '',
      author,
      version: (data.version as string) ?? '0.0.0',
      metadataVersion,
      allowedTools: parseCommaSeparated(data['allowed-tools']),
      argumentHint: data['argument-hint'] as string | undefined,
      inputSchema: parseInputSchema(data),
      annotations: parseAnnotations(data, riskLevel),
      userInvocable: data['user-invocable'] !== false, // default true
      tags: parseCommaSeparated(data.tags),
      license: data.license as string | undefined,
      capabilities: parseCommaSeparated(data.capabilities),
      activationIntents: parseCommaSeparated(data['activation-intents']),
      activationEvents: parseCommaSeparated(data['activation-events']),
      activationArtifacts: parseCommaSeparated(data['activation-artifacts']),
      riskLevel,
      rarity: riskToRarity(riskLevel),
      phase,
      filePath,
      bodyMarkdown: content,
    };
  } catch {
    return null;
  }
}

export function discoverSkillDirs(rootPath: string): string[] {
  const dirs: string[] = [];

  // Check skills/ directory
  const skillsDir = path.join(rootPath, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          dirs.push(skillFile);
        }
      }
    }
  }

  // Check .chalk/skills/ directory (project-level skills)
  const chalkSkillsDir = path.join(rootPath, '.chalk', 'skills');
  if (fs.existsSync(chalkSkillsDir)) {
    for (const entry of fs.readdirSync(chalkSkillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillFile = path.join(chalkSkillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          dirs.push(skillFile);
        }
      }
    }
  }

  return dirs;
}

export function loadAllSkills(rootPath: string): ChalkSkill[] {
  const indexPath = path.join(rootPath, 'skills', 'skills-index.yaml');
  const phaseIndex = loadPhaseIndex(indexPath);
  const skillFiles = discoverSkillDirs(rootPath);

  const skills: ChalkSkill[] = [];
  for (const filePath of skillFiles) {
    const skill = parseSkillFile(filePath, phaseIndex);
    if (skill) {
      skills.push(skill);
    }
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}
