import * as vscode from 'vscode';
import { ProgressionState } from './types';
import { createInitialState } from './progression';

const STATE_KEY = 'chalkSkills.progressionState';

export function loadProgressionState(context: vscode.ExtensionContext): ProgressionState {
  const raw = context.globalState.get<ProgressionState>(STATE_KEY);
  if (!raw || !raw.version) {
    return createInitialState();
  }
  // Future: add migration logic here when version > 1
  return raw;
}

export async function saveProgressionState(
  context: vscode.ExtensionContext,
  state: ProgressionState,
): Promise<void> {
  await context.globalState.update(STATE_KEY, state);
}
