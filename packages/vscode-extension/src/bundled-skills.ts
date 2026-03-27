import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ChalkSkill, Rarity, RiskLevel, SkillAnnotations, Phase } from './types';

/**
 * Shape of the JSON produced by scripts/bundle-skills.js
 */
interface BundledSkillEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  metadataVersion: 1 | 2 | 3;
  allowedTools: string[];
  argumentHint?: string;
  annotations: SkillAnnotations;
  userInvocable: boolean;
  tags: string[];
  license?: string;
  capabilities: string[];
  activationIntents: string[];
  activationEvents: string[];
  activationArtifacts: string[];
  riskLevel: RiskLevel;
  rarity: Rarity;
  phase: Phase;
  bodyMarkdown: string;
  contextNeeds: string[];
  benefitsFrom: string[];
}

interface SkillBundle {
  version: string;
  generatedAt: string;
  skillCount: number;
  skills: BundledSkillEntry[];
  registryYaml: string | null;
  indexYaml: string | null;
}

let cachedBundle: SkillBundle | null = null;

/**
 * Resolve the path to bundled-skills.json that ships inside the extension.
 * At runtime the extension host runs dist/extension.js, so the JSON is a sibling.
 */
function getBundlePath(): string {
  return path.join(__dirname, 'bundled-skills.json');
}

/**
 * Load the bundled skill catalog from the extension's dist/ directory.
 * Returns null if the bundle was not found (e.g. dev environment).
 */
export function loadBundledSkillBundle(): SkillBundle | null {
  if (cachedBundle) return cachedBundle;

  const bundlePath = getBundlePath();
  if (!fs.existsSync(bundlePath)) return null;

  try {
    const raw = fs.readFileSync(bundlePath, 'utf-8');
    cachedBundle = JSON.parse(raw) as SkillBundle;
    return cachedBundle;
  } catch {
    return null;
  }
}

/**
 * Load the curated Chalk skills that are bundled inside the extension.
 * These are pre-parsed — no gray-matter or filesystem scanning needed.
 *
 * Each skill's `filePath` is set to `bundled:<id>` since there is no on-disk
 * file until the user syncs to their workspace.
 */
export function loadBundledSkills(): ChalkSkill[] {
  const bundle = loadBundledSkillBundle();
  if (!bundle) return [];

  return bundle.skills.map((entry): ChalkSkill => ({
    ...entry,
    filePath: `bundled:${entry.id}`,
  }));
}

/**
 * Get the bundled registry.yaml content (for catalog UI).
 */
export function getBundledRegistryYaml(): string | null {
  const bundle = loadBundledSkillBundle();
  return bundle?.registryYaml ?? null;
}

/**
 * Sync all bundled skills to a workspace directory.
 * Creates `<rootPath>/skills/<id>/SKILL.md` for every bundled skill
 * that doesn't already exist on disk.
 *
 * Returns the number of skills written.
 */
export function syncBundledSkillsToWorkspace(rootPath: string): { written: number; skipped: number } {
  const bundle = loadBundledSkillBundle();
  if (!bundle) return { written: 0, skipped: 0 };

  const skillsDir = path.join(rootPath, '.chalk', 'skills');
  let written = 0;
  let skipped = 0;

  for (const entry of bundle.skills) {
    const targetDir = path.join(skillsDir, entry.id);
    const targetFile = path.join(targetDir, 'SKILL.md');

    if (fs.existsSync(targetFile)) {
      skipped++;
      continue;
    }

    // Reconstruct the SKILL.md from the bundled data
    const frontmatter = buildFrontmatter(entry);
    const content = `---\n${frontmatter}---\n${entry.bodyMarkdown}`;

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, content, 'utf-8');
    written++;
  }

  return { written, skipped };
}

/**
 * Reconstruct YAML frontmatter from a bundled skill entry.
 * Uses the yaml library for safe serialization of all values.
 */
function buildFrontmatter(entry: BundledSkillEntry): string {
  const frontmatter: Record<string, unknown> = {
    name: entry.id,
    description: entry.description,
    author: entry.author,
    version: entry.version,
    'metadata-version': String(entry.metadataVersion),
    'read-only': entry.annotations.readOnly,
    destructive: entry.annotations.destructive,
    idempotent: entry.annotations.idempotent,
    'open-world': entry.annotations.openWorld,
    'user-invocable': entry.userInvocable,
  };

  if (entry.allowedTools.length) {
    frontmatter['allowed-tools'] = entry.allowedTools.join(', ');
  }
  if (entry.argumentHint) {
    frontmatter['argument-hint'] = entry.argumentHint;
  }
  if (entry.tags.length) {
    frontmatter.tags = entry.tags.join(', ');
  }
  if (entry.capabilities.length) {
    frontmatter.capabilities = entry.capabilities.join(', ');
  }
  if (entry.riskLevel !== 'unknown') {
    frontmatter['risk-level'] = entry.riskLevel;
  }
  if (entry.license) {
    frontmatter.license = entry.license;
  }

  return yaml.stringify(frontmatter);
}
