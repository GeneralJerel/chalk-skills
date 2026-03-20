import type { ProgressionState } from '../../types';
import { PLAYER_LEVELS, SKILL_LEVELS } from '../../types';

export function getPlayerLevelInfo(state: ProgressionState) {
  const current = PLAYER_LEVELS.find(l => l.level === state.playerLevel) ?? PLAYER_LEVELS[0];
  const next = PLAYER_LEVELS.find(l => l.level === state.playerLevel + 1);
  const xpInLevel = state.totalXp - current.xpRequired;
  const xpForLevel = next ? next.xpRequired - current.xpRequired : 1;
  const progress = next ? Math.min(xpInLevel / xpForLevel, 1) : 1;

  return { current, next, progress, xpInLevel, xpForLevel };
}

export function getSkillLevelTitle(level: number): string {
  return SKILL_LEVELS.find(l => l.level === level)?.title ?? 'Novice';
}

export function getSkillLevelProgress(usageCount: number, level: number): number {
  const current = SKILL_LEVELS.find(l => l.level === level);
  const next = SKILL_LEVELS.find(l => l.level === level + 1);
  if (!current || !next) return level >= 5 ? 1 : 0;
  return Math.min((usageCount - current.usesRequired) / (next.usesRequired - current.usesRequired), 1);
}
