import { ChalkSkill, Phase } from '../types';
import { ContextCollector, ContextSection, CollectorStatus } from './collectors/collector';

/** Phase-based defaults: skills that don't declare context-needs get these */
const PHASE_DEFAULTS: Record<Phase, string[]> = {
  foundation:    ['conventions', 'plan-state'],
  design:        ['plan-state', 'recent-activity'],
  architecture:  ['git-status', 'conventions', 'plan-state'],
  engineering:   ['git-status', 'diagnostics', 'test-results'],
  development:   ['git-status', 'diagnostics', 'test-results', 'recent-activity'],
  launch:        ['git-status', 'test-results', 'plan-state'],
  reference:     ['conventions'],
  uncategorized: ['git-status'],
};

/** Hard cap on output size to avoid overwhelming agent context */
const MAX_OUTPUT_LINES = 500;

export interface AssemblyResult {
  markdown: string;
  collectorStatuses: CollectorStatus[];
}

export class ContextAssembler {
  private collectors = new Map<string, ContextCollector>();
  private statuses = new Map<string, CollectorStatus>();

  registerCollector(collector: ContextCollector): void {
    this.collectors.set(collector.id, collector);
    this.statuses.set(collector.id, {
      id: collector.id,
      label: collector.label,
      available: collector.isAvailable(),
      lastRun: null,
      lastDurationMs: null,
      lastEmpty: true,
    });
  }

  getCollectorStatuses(): CollectorStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Assemble context for a specific skill.
   * If the skill declares context-needs, use those.
   * Otherwise, use phase-based defaults.
   * "all" means run every available collector.
   */
  async assembleForSkill(skill: ChalkSkill): Promise<AssemblyResult> {
    const needs = this.resolveNeeds(skill);
    return this.assemble(needs, skill);
  }

  /** Assemble generic workspace context (all collectors) */
  async assembleWorkspaceContext(): Promise<AssemblyResult> {
    const allIds = Array.from(this.collectors.keys());
    return this.assemble(allIds);
  }

  private resolveNeeds(skill: ChalkSkill): string[] {
    if (skill.contextNeeds.length === 1 && skill.contextNeeds[0] === 'all') {
      return Array.from(this.collectors.keys());
    }
    if (skill.contextNeeds.length > 0) {
      return skill.contextNeeds;
    }
    return PHASE_DEFAULTS[skill.phase] ?? ['git-status'];
  }

  private async assemble(needs: string[], skill?: ChalkSkill): Promise<AssemblyResult> {
    // Run collectors in parallel with per-collector timeout
    const results = await Promise.allSettled(
      needs.map(async (need) => {
        const collector = this.collectors.get(need);
        if (!collector || !collector.isAvailable()) return null;

        const start = Date.now();
        try {
          const section = await Promise.race([
            collector.collect(),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error(`Collector ${need} timed out`)), 3000)
            ),
          ]);

          const duration = Date.now() - start;

          // Update status
          this.statuses.set(need, {
            id: collector.id,
            label: collector.label,
            available: true,
            lastRun: Date.now(),
            lastDurationMs: duration,
            lastEmpty: section?.isEmpty ?? true,
          });

          return section;
        } catch {
          // Collector failed or timed out — update status and skip
          this.statuses.set(need, {
            id: collector.id,
            label: collector.label,
            available: true,
            lastRun: Date.now(),
            lastDurationMs: Date.now() - start,
            lastEmpty: true,
          });
          return null;
        }
      })
    );

    // Collect non-empty sections
    const sections: ContextSection[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && !result.value.isEmpty) {
        sections.push(result.value);
      }
    }

    const markdown = this.formatAsMarkdown(sections, skill);
    return {
      markdown,
      collectorStatuses: this.getCollectorStatuses(),
    };
  }

  private formatAsMarkdown(sections: ContextSection[], skill?: ChalkSkill): string {
    const lines: string[] = [];

    // Header
    if (skill) {
      lines.push(`# Workspace Context`);
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push(`Skill: ${skill.name} | Phase: ${skill.phase}`);
    } else {
      lines.push(`# Workspace Context`);
      lines.push(`Generated: ${new Date().toISOString()}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Sections
    for (const section of sections) {
      lines.push(section.heading);
      lines.push(section.content);
      lines.push('');
    }

    // Enforce max lines
    const output = lines.join('\n');
    const outputLines = output.split('\n');
    if (outputLines.length > MAX_OUTPUT_LINES) {
      return outputLines.slice(0, MAX_OUTPUT_LINES).join('\n') + '\n\n... (truncated to 500 lines)';
    }

    return output;
  }
}
