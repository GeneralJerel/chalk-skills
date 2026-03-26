import * as vscode from 'vscode';
import * as path from 'path';
import { ContextCollector, ContextSection, COLLECTOR_IDS } from './collector';

interface FileActivity {
  relativePath: string;
  editCount: number;
  lastEdited: number;
}

/**
 * Tracks which files you've been editing in the current session.
 * Must call `startTracking()` during extension activation to begin
 * listening for document change events.
 */
export class ActivityCollector implements ContextCollector {
  readonly id = COLLECTOR_IDS.RECENT_ACTIVITY;
  readonly label = 'Recent Activity';

  private activity = new Map<string, { editCount: number; lastEdited: number }>();
  private disposable: vscode.Disposable | undefined;

  constructor(private workspaceRoot: string) {}

  isAvailable(): boolean {
    return true;
  }

  /** Call during extension activation to begin tracking edits */
  startTracking(): vscode.Disposable {
    this.disposable = vscode.workspace.onDidChangeTextDocument((e) => {
      const filePath = e.document.uri.fsPath;
      // Only track workspace files
      if (!filePath.startsWith(this.workspaceRoot)) return;
      // Skip generated/vendor files
      const rel = path.relative(this.workspaceRoot, filePath);
      if (rel.startsWith('node_modules') || rel.startsWith('dist') || rel.startsWith('.git')) return;

      const existing = this.activity.get(filePath);
      this.activity.set(filePath, {
        editCount: (existing?.editCount ?? 0) + 1,
        lastEdited: Date.now(),
      });
    });

    return this.disposable;
  }

  async collect(): Promise<ContextSection> {
    const now = Date.now();

    if (this.activity.size === 0) {
      return {
        heading: '## Recent Activity',
        content: 'No file edits recorded in this session yet.',
        freshness: now,
        isEmpty: true,
      };
    }

    // Convert to array and sort by recency
    const files: FileActivity[] = [];
    for (const [fullPath, data] of this.activity) {
      files.push({
        relativePath: path.relative(this.workspaceRoot, fullPath),
        editCount: data.editCount,
        lastEdited: data.lastEdited,
      });
    }

    files.sort((a, b) => b.lastEdited - a.lastEdited);

    const contentParts: string[] = [];
    contentParts.push(`Files edited this session: ${files.length}`);
    contentParts.push('Most active (by recency):');

    for (const file of files.slice(0, 15)) {
      const ago = this.timeAgo(now - file.lastEdited);
      contentParts.push(`  - ${file.relativePath} (${file.editCount} edits, last ${ago})`);
    }

    if (files.length > 15) {
      contentParts.push(`  ... and ${files.length - 15} more files`);
    }

    // Top by edit count (different sort)
    const byEdits = [...files].sort((a, b) => b.editCount - a.editCount);
    const topEdited = byEdits.slice(0, 5);
    if (topEdited.length > 0 && topEdited[0].editCount > 3) {
      contentParts.push('Hotspots (most edits):');
      for (const file of topEdited) {
        contentParts.push(`  - ${file.relativePath}: ${file.editCount} edits`);
      }
    }

    return {
      heading: '## Recent Activity',
      content: contentParts.join('\n'),
      freshness: now,
      isEmpty: false,
    };
  }

  private timeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  dispose(): void {
    this.disposable?.dispose();
  }
}
