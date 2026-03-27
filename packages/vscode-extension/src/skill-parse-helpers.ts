import { RiskLevel, SkillAnnotations } from './types';

export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** Parse a frontmatter field that can be a YAML array or comma-separated string */
export function parseListField(value: unknown): string[] {
  if (typeof value === 'string') return parseCommaSeparated(value);
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

export function toDisplayName(kebab: string): string {
  return kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Derive behavioral annotations from explicit fields or fall back to risk-level heuristics */
export function parseAnnotations(data: Record<string, unknown>, riskLevel: RiskLevel): SkillAnnotations {
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
