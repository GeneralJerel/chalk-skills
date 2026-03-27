import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ChalkSkill, InputSchema, RiskLevel, riskToRarity } from './types';
import { classifyPhase } from './phase-classifier';
import { loadPhaseIndex } from './skill-indexer';
import { loadBundledSkills } from './bundled-skills';
import { parseCommaSeparated, parseListField, toDisplayName, parseAnnotations } from './skill-parse-helpers';

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
      // Context injection fields
      contextNeeds: parseListField(data['context-needs']),
      benefitsFrom: parseListField(data['benefits-from']),
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

  // If no workspace skills were found, fall back to the bundled catalog
  // that ships inside the extension itself.
  if (skills.length === 0) {
    const bundled = loadBundledSkills();
    if (bundled.length > 0) {
      return bundled;
    }
  }

  // Merge: for any bundled skill not already present on disk, include it
  // so the user always sees the full curated catalog.
  if (skills.length > 0) {
    const existingIds = new Set(skills.map(s => s.id));
    const bundled = loadBundledSkills();
    for (const bs of bundled) {
      if (!existingIds.has(bs.id)) {
        skills.push(bs);
      }
    }
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}
