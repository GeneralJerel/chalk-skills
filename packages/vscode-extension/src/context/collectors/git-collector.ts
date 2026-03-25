import { execSync } from 'child_process';
import { ContextCollector, ContextSection, COLLECTOR_IDS } from './collector';

const EXEC_TIMEOUT_MS = 3000;

function run(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, timeout: EXEC_TIMEOUT_MS, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

export class GitCollector implements ContextCollector {
  readonly id = COLLECTOR_IDS.GIT_STATUS;
  readonly label = 'Git State';

  constructor(private workspaceRoot: string) {}

  isAvailable(): boolean {
    return run('git rev-parse --is-inside-work-tree', this.workspaceRoot) === 'true';
  }

  async collect(): Promise<ContextSection> {
    const cwd = this.workspaceRoot;
    const now = Date.now();

    const branch = run('git branch --show-current', cwd) || 'detached HEAD';
    const status = run('git status --porcelain', cwd);
    const logLines = run('git log --oneline -10 --no-decorate', cwd);
    const diffStat = run('git diff --stat HEAD~5..HEAD 2>/dev/null', cwd);
    const aheadBehind = run('git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null', cwd);

    // Parse uncommitted changes
    const statusLines = status ? status.split('\n').filter(Boolean) : [];
    const modified = statusLines.filter(l => l.startsWith(' M') || l.startsWith('M ')).length;
    const added = statusLines.filter(l => l.startsWith('A ') || l.startsWith('??')).length;
    const deleted = statusLines.filter(l => l.startsWith('D ') || l.startsWith(' D')).length;

    // Parse ahead/behind
    let trackingInfo = '';
    if (aheadBehind) {
      const [ahead, behind] = aheadBehind.split(/\s+/).map(Number);
      const parts: string[] = [];
      if (ahead > 0) parts.push(`${ahead} ahead`);
      if (behind > 0) parts.push(`${behind} behind`);
      if (parts.length > 0) trackingInfo = ` (${parts.join(', ')})`;
    }

    // Try to get active PR info (non-blocking)
    const prInfo = run('gh pr view --json title,url,state,number --jq \'\"PR #\" + (.number|tostring) + \": \" + .title + \" (\" + .state + \")\"\'', cwd);

    // Build content
    const contentParts: string[] = [];
    contentParts.push(`Branch: ${branch}${trackingInfo}`);

    if (statusLines.length > 0) {
      contentParts.push(`Uncommitted: ${statusLines.length} files (${modified} modified, ${added} added, ${deleted} deleted)`);
      // Show up to 15 files
      const fileList = statusLines.slice(0, 15).map(l => `  - ${l.slice(3)} (${l.slice(0, 2).trim()})`);
      contentParts.push(fileList.join('\n'));
      if (statusLines.length > 15) {
        contentParts.push(`  ... and ${statusLines.length - 15} more`);
      }
    } else {
      contentParts.push('Working tree clean');
    }

    if (prInfo) {
      contentParts.push(`Active PR: ${prInfo}`);
    }

    if (logLines) {
      contentParts.push('Recent commits:');
      const commits = logLines.split('\n').slice(0, 10);
      contentParts.push(commits.map(c => `  - ${c}`).join('\n'));
    }

    if (diffStat) {
      // Just the summary line (e.g. "5 files changed, 120 insertions(+), 30 deletions(-)")
      const summaryLine = diffStat.split('\n').pop()?.trim();
      if (summaryLine && summaryLine.includes('changed')) {
        contentParts.push(`Recent diff: ${summaryLine}`);
      }
    }

    const content = contentParts.join('\n');
    return {
      heading: '## Git State',
      content,
      freshness: now,
      isEmpty: !branch,
    };
  }
}
