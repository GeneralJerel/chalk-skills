import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { RegistrySkillEntry } from './skill-registry';

// ── Activation State ──

/** Persisted record of which skills the user has enabled */
export interface CatalogState {
  version: 1;
  /** The bundle the user initially selected (for UI display) */
  selectedBundle: string | null;
  /** Explicit set of enabled skill IDs */
  enabledSkills: string[];
  /** Timestamp of last change */
  lastModified: number;
}

const DEFAULT_STATE: CatalogState = {
  version: 1,
  selectedBundle: null,
  enabledSkills: [],
  lastModified: Date.now(),
};

const STATE_KEY = 'chalk.catalogState';

// ── SkillActivation ──

export class SkillActivation {
  private state: CatalogState;
  private enabledSet: Set<string>;
  private _onDidChange = new vscode.EventEmitter<CatalogState>();

  /** Fires when the activation state changes */
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceRoot: string,
  ) {
    this.state = this.loadState();
    this.enabledSet = new Set(this.state.enabledSkills);
  }

  // ── State Persistence ──

  private loadState(): CatalogState {
    const stored = this.context.globalState.get<CatalogState>(STATE_KEY);
    if (stored && stored.version === 1) return stored;
    return { ...DEFAULT_STATE };
  }

  private async persistState(): Promise<void> {
    this.state.enabledSkills = Array.from(this.enabledSet).sort();
    this.state.lastModified = Date.now();
    await this.context.globalState.update(STATE_KEY, this.state);
    this._onDidChange.fire(this.state);
  }

  // ── Queries ──

  getState(): CatalogState {
    return { ...this.state, enabledSkills: Array.from(this.enabledSet).sort() };
  }

  isEnabled(skillId: string): boolean {
    return this.enabledSet.has(skillId);
  }

  getEnabledSkills(): string[] {
    return Array.from(this.enabledSet).sort();
  }

  getSelectedBundle(): string | null {
    return this.state.selectedBundle;
  }

  /** Whether the user has completed first-time setup */
  isOnboarded(): boolean {
    return this.state.selectedBundle !== null || this.enabledSet.size > 0;
  }

  // ── Mutations ──

  /** Enable a single skill */
  async enableSkill(skillId: string): Promise<void> {
    this.enabledSet.add(skillId);
    await this.persistState();
    await this.syncSkillToWorkspace(skillId, true);
  }

  /** Disable a single skill */
  async disableSkill(skillId: string): Promise<void> {
    this.enabledSet.delete(skillId);
    await this.persistState();
    await this.syncSkillToWorkspace(skillId, false);
  }

  /** Toggle a skill's enabled state */
  async toggleSkill(skillId: string): Promise<boolean> {
    const nowEnabled = !this.enabledSet.has(skillId);
    if (nowEnabled) {
      this.enabledSet.add(skillId);
    } else {
      this.enabledSet.delete(skillId);
    }
    await this.persistState();
    await this.syncSkillToWorkspace(skillId, nowEnabled);
    return nowEnabled;
  }

  /** Apply a bundle — enables all skills in the bundle, records selection */
  async applyBundle(bundleId: string, skillIds: string[]): Promise<void> {
    this.state.selectedBundle = bundleId;
    // Start fresh with bundle skills
    this.enabledSet = new Set(skillIds);
    await this.persistState();
    await this.syncAllToWorkspace();
  }

  /** Enable multiple skills at once */
  async enableMany(skillIds: string[]): Promise<void> {
    for (const id of skillIds) {
      this.enabledSet.add(id);
    }
    await this.persistState();
    await this.syncAllToWorkspace();
  }

  /** Disable all skills */
  async clearAll(): Promise<void> {
    this.enabledSet.clear();
    this.state.selectedBundle = null;
    await this.persistState();
    await this.syncAllToWorkspace();
  }

  // ── Workspace Sync ──

  /**
   * Syncs a single skill's SKILL.md symlink or marker in .chalk/skills/.
   * When a skill is enabled, we create a symlink (or copy) from the source
   * skills/ dir to .chalk/skills/ so the skill is discoverable. When disabled,
   * we remove it.
   */
  private async syncSkillToWorkspace(skillId: string, enabled: boolean): Promise<void> {
    const targetDir = path.join(this.workspaceRoot, '.chalk', 'skills', skillId);
    const sourceDir = path.join(this.workspaceRoot, 'skills', skillId);

    if (enabled) {
      // Skill exists in source — ensure it's accessible in .chalk/skills/
      if (fs.existsSync(sourceDir)) {
        // Source skills are already discoverable by the loader via skills/ dir,
        // so we just need to ensure .chalk/skills/ has a reference for project-level usage
        this.ensureDir(path.join(this.workspaceRoot, '.chalk', 'skills'));

        // Create a marker file that indicates this skill is enabled
        const markerPath = path.join(this.workspaceRoot, '.chalk', 'skills', `.${skillId}.enabled`);
        fs.writeFileSync(markerPath, JSON.stringify({ skillId, enabledAt: Date.now() }), 'utf-8');
      }
    } else {
      // Remove the enabled marker
      const markerPath = path.join(this.workspaceRoot, '.chalk', 'skills', `.${skillId}.enabled`);
      if (fs.existsSync(markerPath)) {
        fs.unlinkSync(markerPath);
      }
    }
  }

  /** Full sync — reconcile .chalk/skills/ markers with enabled set */
  private async syncAllToWorkspace(): Promise<void> {
    const markerDir = path.join(this.workspaceRoot, '.chalk', 'skills');
    this.ensureDir(markerDir);

    // Clean up stale markers
    try {
      const entries = fs.readdirSync(markerDir);
      for (const entry of entries) {
        if (entry.startsWith('.') && entry.endsWith('.enabled')) {
          const skillId = entry.slice(1, -'.enabled'.length);
          if (!this.enabledSet.has(skillId)) {
            fs.unlinkSync(path.join(markerDir, entry));
          }
        }
      }
    } catch {
      // Directory might not exist yet, that's fine
    }

    // Create markers for all enabled skills
    for (const skillId of this.enabledSet) {
      const markerPath = path.join(markerDir, `.${skillId}.enabled`);
      if (!fs.existsSync(markerPath)) {
        fs.writeFileSync(markerPath, JSON.stringify({ skillId, enabledAt: Date.now() }), 'utf-8');
      }
    }
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
