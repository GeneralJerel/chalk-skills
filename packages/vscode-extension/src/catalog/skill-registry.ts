import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { Phase } from '../types';

// ── Registry Types ──

export interface RegistrySkillEntry {
  id: string;
  description: string;
  phase: Phase;
  tags: string[];
}

export interface RegistryBundle {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Resolved skill IDs (includes inherited) */
  skillIds: string[];
  /** Whether this bundle selects all skills */
  all?: boolean;
}

export interface RegistryManifest {
  version: string;
  bundles: RegistryBundle[];
  skills: RegistrySkillEntry[];
}

interface RawBundle {
  label: string;
  description: string;
  icon: string;
  skills?: string[];
  includes?: string;
  all?: boolean;
}

interface RawSkill {
  description: string;
  phase: string;
  tags: string[];
}

// ── SkillRegistry ──

export class SkillRegistry {
  private manifest: RegistryManifest;
  private skillMap: Map<string, RegistrySkillEntry>;
  private bundleMap: Map<string, RegistryBundle>;

  private constructor(manifest: RegistryManifest) {
    this.manifest = manifest;
    this.skillMap = new Map(manifest.skills.map(s => [s.id, s]));
    this.bundleMap = new Map(manifest.bundles.map(b => [b.id, b]));
  }

  /** Load registry from a YAML file path */
  static fromFile(filePath: string): SkillRegistry {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return SkillRegistry.fromYaml(raw);
  }

  /** Parse registry from YAML string */
  static fromYaml(yamlString: string): SkillRegistry {
    const doc = parseYaml(yamlString) as {
      version?: string;
      bundles?: Record<string, RawBundle>;
      skills?: Record<string, RawSkill>;
    };

    // Parse skills
    const skills: RegistrySkillEntry[] = [];
    if (doc.skills) {
      for (const [id, entry] of Object.entries(doc.skills)) {
        skills.push({
          id,
          description: entry.description ?? '',
          phase: (entry.phase as Phase) ?? 'uncategorized',
          tags: Array.isArray(entry.tags) ? entry.tags : [],
        });
      }
    }

    const allSkillIds = skills.map(s => s.id);

    // Parse bundles — two-pass for `includes` resolution
    const rawBundles = doc.bundles ?? {};
    const resolvedBundles: RegistryBundle[] = [];
    const resolvedSkillSets = new Map<string, Set<string>>();

    // First pass: build direct skill sets
    for (const [id, raw] of Object.entries(rawBundles)) {
      if (raw.all) {
        resolvedSkillSets.set(id, new Set(allSkillIds));
      } else {
        resolvedSkillSets.set(id, new Set(raw.skills ?? []));
      }
    }

    // Second pass: resolve includes
    for (const [id, raw] of Object.entries(rawBundles)) {
      const skillSet = new Set(resolvedSkillSets.get(id)!);
      if (raw.includes && resolvedSkillSets.has(raw.includes)) {
        for (const sid of resolvedSkillSets.get(raw.includes)!) {
          skillSet.add(sid);
        }
      }

      const bundle: RegistryBundle = {
        id,
        label: raw.label ?? id,
        description: raw.description ?? '',
        icon: raw.icon ?? 'package',
        skillIds: Array.from(skillSet).sort(),
        all: raw.all,
      };
      resolvedBundles.push(bundle);
      resolvedSkillSets.set(id, skillSet);
    }

    return new SkillRegistry({
      version: doc.version ?? '1.0.0',
      bundles: resolvedBundles,
      skills: skills.sort((a, b) => a.id.localeCompare(b.id)),
    });
  }

  // ── Queries ──

  getAllSkills(): RegistrySkillEntry[] {
    return this.manifest.skills;
  }

  getSkill(id: string): RegistrySkillEntry | undefined {
    return this.skillMap.get(id);
  }

  getAllBundles(): RegistryBundle[] {
    return this.manifest.bundles;
  }

  getBundle(id: string): RegistryBundle | undefined {
    return this.bundleMap.get(id);
  }

  /** Get skills grouped by phase */
  getSkillsByPhase(): Map<Phase, RegistrySkillEntry[]> {
    const grouped = new Map<Phase, RegistrySkillEntry[]>();
    for (const skill of this.manifest.skills) {
      const list = grouped.get(skill.phase) ?? [];
      list.push(skill);
      grouped.set(skill.phase, list);
    }
    return grouped;
  }

  /** Search skills by query (matches id, description, and tags) */
  searchSkills(query: string): RegistrySkillEntry[] {
    const q = query.toLowerCase();
    return this.manifest.skills.filter(s =>
      s.id.includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.includes(q))
    );
  }

  /** Check if a skill ID exists in the registry */
  has(skillId: string): boolean {
    return this.skillMap.has(skillId);
  }

  /** Get the total number of registered skills */
  get size(): number {
    return this.manifest.skills.length;
  }

  /** Find which bundles contain a given skill */
  bundlesContaining(skillId: string): RegistryBundle[] {
    return this.manifest.bundles.filter(b => b.skillIds.includes(skillId));
  }
}

/** Discover the registry.yaml file from a workspace root */
export function findRegistryPath(rootPath: string): string | undefined {
  const candidates = [
    path.join(rootPath, 'skills', 'registry.yaml'),
    path.join(rootPath, '.chalk', 'registry.yaml'),
    path.join(rootPath, 'registry.yaml'),
  ];
  return candidates.find(p => fs.existsSync(p));
}
