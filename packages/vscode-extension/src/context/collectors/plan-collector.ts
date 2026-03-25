import * as fs from 'fs';
import * as path from 'path';
import { ContextCollector, ContextSection, COLLECTOR_IDS } from './collector';

interface PlanInfo {
  filePath: string;
  relativePath: string;
  name: string;
  todos: { text: string; done: boolean }[];
  lastModified: number;
}

export class PlanCollector implements ContextCollector {
  readonly id = COLLECTOR_IDS.PLAN_STATE;
  readonly label = 'Plan State';

  constructor(private workspaceRoot: string) {}

  isAvailable(): boolean {
    return true; // Always try — plans can appear at any time
  }

  async collect(): Promise<ContextSection> {
    const now = Date.now();
    const plans = this.discoverPlans();

    if (plans.length === 0) {
      return {
        heading: '## Plan State',
        content: 'No plan files found in workspace.',
        freshness: now,
        isEmpty: true,
      };
    }

    const contentParts: string[] = [];
    contentParts.push(`Found ${plans.length} plan file(s):`);

    for (const plan of plans) {
      const totalTodos = plan.todos.length;
      const doneTodos = plan.todos.filter(t => t.done).length;
      const progress = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

      contentParts.push(`\n### ${plan.name}`);
      contentParts.push(`File: ${plan.relativePath}`);
      contentParts.push(`Progress: ${doneTodos}/${totalTodos} (${progress}%)`);

      // Show remaining TODOs
      const remaining = plan.todos.filter(t => !t.done);
      if (remaining.length > 0) {
        contentParts.push('Remaining:');
        for (const todo of remaining.slice(0, 10)) {
          contentParts.push(`  - [ ] ${todo.text}`);
        }
        if (remaining.length > 10) {
          contentParts.push(`  ... and ${remaining.length - 10} more items`);
        }
      }

      // Show recently completed (last 5)
      const completed = plan.todos.filter(t => t.done);
      if (completed.length > 0) {
        contentParts.push(`Completed: ${completed.length} items`);
      }
    }

    return {
      heading: '## Plan State',
      content: contentParts.join('\n'),
      freshness: now,
      isEmpty: false,
    };
  }

  private discoverPlans(): PlanInfo[] {
    const plans: PlanInfo[] = [];
    const searchDirs = [
      this.workspaceRoot,
      path.join(this.workspaceRoot, '.chalk', 'docs'),
      path.join(this.workspaceRoot, '.chalk'),
      path.join(this.workspaceRoot, 'docs'),
    ];

    const seen = new Set<string>();

    for (const dir of searchDirs) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          if (!this.isPlanFile(entry.name)) continue;

          const fullPath = path.join(dir, entry.name);
          if (seen.has(fullPath)) continue;
          seen.add(fullPath);

          const plan = this.parsePlanFile(fullPath);
          if (plan) plans.push(plan);
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    // Sort by most recently modified
    plans.sort((a, b) => b.lastModified - a.lastModified);
    return plans.slice(0, 5); // Cap at 5 plans to avoid noise
  }

  private isPlanFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.plan.md') ||
      lower === 'plan.md' ||
      lower === 'todo.md' ||
      lower === 'todos.md' ||
      lower === 'roadmap.md'
    );
  }

  private parsePlanFile(fullPath: string): PlanInfo | null {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const stat = fs.statSync(fullPath);
      const relativePath = path.relative(this.workspaceRoot, fullPath);

      // Extract name from first heading or filename
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const name = headingMatch?.[1] ?? path.basename(fullPath, '.md');

      // Parse TODO items (checkbox format)
      const todos: { text: string; done: boolean }[] = [];
      const todoPattern = /^[\s]*[-*]\s+\[([ xX])\]\s+(.+)$/gm;
      let match;
      while ((match = todoPattern.exec(content)) !== null) {
        todos.push({
          done: match[1].toLowerCase() === 'x',
          text: match[2].trim(),
        });
      }

      return {
        filePath: fullPath,
        relativePath,
        name,
        todos,
        lastModified: stat.mtimeMs,
      };
    } catch {
      return null;
    }
  }
}
