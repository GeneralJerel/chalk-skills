#!/usr/bin/env ts-node
/**
 * bundle-skills.ts
 *
 * Reads every SKILL.md in ../../skills/ and the skills-index.yaml phase map,
 * then writes a single bundled-skills.json into dist/ that the extension can
 * import at runtime without needing the user's workspace to contain the skills.
 *
 * Run: npx ts-node scripts/bundle-skills.ts
 * Output: dist/bundled-skills.json
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { RiskLevel, Rarity } from '../src/types';
import { classifyPhase } from '../src/phase-classifier';
import { loadPhaseIndex } from '../src/skill-indexer';
import { parseCommaSeparated, parseListField, toDisplayName, parseAnnotations } from '../src/skill-parse-helpers';

// ── Paths ──────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const INDEX_PATH = path.join(SKILLS_DIR, 'skills-index.yaml');
const REGISTRY_PATH = path.join(SKILLS_DIR, 'registry.yaml');
const OUT_DIR = path.join(__dirname, '..', 'dist');
const OUT_FILE = path.join(OUT_DIR, 'bundled-skills.json');

const RISK_TO_RARITY: Record<string, Rarity> = { high: 'epic', medium: 'rare' };

// ── Main ───────────────────────────────────────────────────────────

function main() {
  const phaseIndex = loadPhaseIndex(INDEX_PATH);

  // Discover all SKILL.md files
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    try {
      const raw = fs.readFileSync(skillFile, 'utf-8');
      const { data, content } = matter(raw);
      const name = data.name as string;
      if (!name) continue;

      const riskLevel = (data['risk-level'] as RiskLevel) ?? 'unknown';
      const mv = data['metadata-version'];
      const metadataVersion = mv === '3' ? 3 : mv === '2' ? 2 : 1;

      const indexPhase = phaseIndex.get(name);
      const phase = indexPhase ?? classifyPhase(name, parseCommaSeparated(data.capabilities));
      const author = (data.author as string) ?? (data.owner as string) ?? 'chalk';

      skills.push({
        id: name,
        name: toDisplayName(name),
        description: (data.description as string) ?? '',
        author,
        version: (data.version as string) ?? '0.0.0',
        metadataVersion,
        allowedTools: parseCommaSeparated(data['allowed-tools']),
        argumentHint: data['argument-hint'] as string | undefined,
        annotations: parseAnnotations(data as Record<string, unknown>, riskLevel),
        userInvocable: data['user-invocable'] !== false,
        tags: parseCommaSeparated(data.tags),
        license: data.license as string | undefined,
        capabilities: parseCommaSeparated(data.capabilities),
        activationIntents: parseCommaSeparated(data['activation-intents']),
        activationEvents: parseCommaSeparated(data['activation-events']),
        activationArtifacts: parseCommaSeparated(data['activation-artifacts']),
        riskLevel,
        rarity: RISK_TO_RARITY[riskLevel] ?? 'common',
        phase,
        bodyMarkdown: content,
        contextNeeds: parseListField(data['context-needs']),
        benefitsFrom: parseListField(data['benefits-from']),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ Skipping ${entry.name}: ${message}`);
    }
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));

  // Also bundle the registry.yaml if present
  let registryYaml: string | null = null;
  if (fs.existsSync(REGISTRY_PATH)) {
    registryYaml = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  }

  // Also bundle the skills-index.yaml
  let indexYaml: string | null = null;
  if (fs.existsSync(INDEX_PATH)) {
    indexYaml = fs.readFileSync(INDEX_PATH, 'utf-8');
  }

  const bundle = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    skillCount: skills.length,
    skills,
    registryYaml,
    indexYaml,
  };

  // Ensure output directory exists
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle, null, 2), 'utf-8');
  console.log(`✓ Bundled ${skills.length} skills → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
