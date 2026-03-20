import * as vscode from 'vscode';
import * as path from 'path';
import { ChalkSkill } from './types';

export interface AutoRecorderCallbacks {
  onSkillUsed: (skillId: string, trigger: 'file-read' | 'artifact-change') => void;
}

export class AutoRecorder implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private cooldowns = new Map<string, number>();
  private skillByPath = new Map<string, string>();
  private artifactWatchers: vscode.FileSystemWatcher[] = [];

  constructor(
    private callbacks: AutoRecorderCallbacks,
  ) {}

  setSkills(skills: ChalkSkill[]) {
    // Rebuild path -> skillId lookup
    this.skillByPath.clear();
    for (const skill of skills) {
      this.skillByPath.set(skill.filePath, skill.id);
    }

    // Rebuild artifact watchers
    this.disposeArtifactWatchers();
    const artifactPatterns = new Map<string, string>();
    for (const skill of skills) {
      for (const pattern of skill.activationArtifacts) {
        if (pattern) {
          artifactPatterns.set(pattern, skill.id);
        }
      }
    }

    for (const [pattern, skillId] of artifactPatterns) {
      try {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate(() => this.handleArtifactChange(skillId));
        watcher.onDidChange(() => this.handleArtifactChange(skillId));
        this.artifactWatchers.push(watcher);
      } catch {
        // Invalid glob pattern, skip
      }
    }
  }

  startWatching() {
    // Watch for SKILL.md file opens (agents reading skills)
    const docOpenDisposable = vscode.workspace.onDidOpenTextDocument((doc) => {
      if (!this.isEnabled()) return;

      const filePath = doc.uri.fsPath;
      if (!filePath.endsWith('SKILL.md')) return;

      const skillId = this.skillByPath.get(filePath);
      if (skillId) {
        this.tryRecord(skillId, 'file-read');
      }
    });

    this.disposables.push(docOpenDisposable);
  }

  private handleArtifactChange(skillId: string) {
    if (!this.isEnabled()) return;
    this.tryRecord(skillId, 'artifact-change');
  }

  private tryRecord(skillId: string, trigger: 'file-read' | 'artifact-change') {
    const now = Date.now();
    const cooldownMs = this.getCooldownMs();
    const lastRecorded = this.cooldowns.get(skillId) ?? 0;

    if (now - lastRecorded < cooldownMs) return;

    this.cooldowns.set(skillId, now);
    this.callbacks.onSkillUsed(skillId, trigger);
  }

  private isEnabled(): boolean {
    return vscode.workspace.getConfiguration('chalkSkills.autoRecord').get<boolean>('enabled', true);
  }

  private getCooldownMs(): number {
    const seconds = vscode.workspace.getConfiguration('chalkSkills.autoRecord').get<number>('cooldownSeconds', 60);
    return seconds * 1000;
  }

  private disposeArtifactWatchers() {
    for (const watcher of this.artifactWatchers) {
      watcher.dispose();
    }
    this.artifactWatchers = [];
  }

  dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposeArtifactWatchers();
  }
}
