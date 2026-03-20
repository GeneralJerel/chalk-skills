import * as vscode from 'vscode';
import { ChalkSkill, Phase } from './types';
import { classifyPhaseEnhanced } from './phase-classifier';

const OVERRIDE_KEY = 'chalkSkills.phaseOverrides';

export function loadPhaseOverrides(context: vscode.ExtensionContext): Record<string, Phase> {
  return context.globalState.get<Record<string, Phase>>(OVERRIDE_KEY) ?? {};
}

export async function savePhaseOverride(
  context: vscode.ExtensionContext,
  skillId: string,
  phase: Phase,
): Promise<void> {
  const overrides = loadPhaseOverrides(context);
  overrides[skillId] = phase;
  await context.globalState.update(OVERRIDE_KEY, overrides);
}

/**
 * Auto-classify uncategorized skills using the enhanced classifier.
 * User overrides take priority over auto-classification.
 */
export function autoClassifySkills(
  skills: ChalkSkill[],
  overrides: Record<string, Phase>,
): ChalkSkill[] {
  return skills.map(skill => {
    // User override takes highest priority
    const override = overrides[skill.id];
    if (override) {
      return { ...skill, phase: override };
    }

    // Already classified from index? Keep it.
    if (skill.phase !== 'uncategorized') {
      return skill;
    }

    // Try enhanced classification
    const classified = classifyPhaseEnhanced(skill);
    if (classified !== 'uncategorized') {
      return { ...skill, phase: classified };
    }

    return skill;
  });
}
