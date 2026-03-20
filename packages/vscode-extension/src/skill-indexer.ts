import * as fs from 'fs';

const PHASE_COMMENT_RE = /^#\s*---\s*Phase\s+(\d+):\s*(.+?)\s*---/;

const PHASE_NUMBER_MAP: Record<string, string> = {
  '0': 'foundation',
  '3': 'design',
  '4': 'architecture',
  '5': 'engineering',
  '6': 'development',
  '8': 'launch',
};

const NAME_RE = /^\s*-\s*name:\s*(.+)/;

/**
 * Parse skills-index.yaml including YAML comment boundaries for phase grouping.
 * Returns a map of skill name -> phase id.
 */
export function loadPhaseIndex(indexPath: string): Map<string, string> {
  const phaseMap = new Map<string, string>();

  if (!fs.existsSync(indexPath)) {
    return phaseMap;
  }

  const raw = fs.readFileSync(indexPath, 'utf-8');
  const lines = raw.split('\n');

  let currentPhase = 'uncategorized';

  for (const line of lines) {
    const phaseMatch = line.match(PHASE_COMMENT_RE);
    if (phaseMatch) {
      const phaseNum = phaseMatch[1];
      currentPhase = PHASE_NUMBER_MAP[phaseNum] ?? 'uncategorized';
      continue;
    }

    const nameMatch = line.match(NAME_RE);
    if (nameMatch) {
      const skillName = nameMatch[1].trim();
      phaseMap.set(skillName, currentPhase);
    }
  }

  return phaseMap;
}
