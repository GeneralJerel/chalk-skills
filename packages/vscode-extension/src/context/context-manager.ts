import * as vscode from 'vscode';
import { ChalkSkill } from '../types';
import { ContextAssembler, AssemblyResult } from './context-assembler';
import { ContextWriter } from './context-writer';
import { CollectorStatus } from './collectors/collector';
import { GitCollector } from './collectors/git-collector';
import { DiagnosticsCollector } from './collectors/diagnostics-collector';
import { TestCollector } from './collectors/test-collector';
import { ActivityCollector } from './collectors/activity-collector';
import { PlanCollector } from './collectors/plan-collector';
import { ConventionCollector } from './collectors/convention-collector';

export class ContextManager implements vscode.Disposable {
  private assembler: ContextAssembler;
  private writer: ContextWriter;
  private activityCollector: ActivityCollector;
  private backgroundTimer: NodeJS.Timeout | undefined;
  private disposables: vscode.Disposable[] = [];
  private gitignoreSetup = false;

  constructor(private workspaceRoot: string) {
    this.assembler = new ContextAssembler();
    this.writer = new ContextWriter(workspaceRoot);

    // Register all built-in collectors
    this.assembler.registerCollector(new GitCollector(workspaceRoot));
    this.assembler.registerCollector(new DiagnosticsCollector(workspaceRoot));
    this.assembler.registerCollector(new TestCollector(workspaceRoot));

    this.activityCollector = new ActivityCollector(workspaceRoot);
    this.assembler.registerCollector(this.activityCollector);
    this.disposables.push(this.activityCollector.startTracking());

    this.assembler.registerCollector(new PlanCollector(workspaceRoot));
    this.assembler.registerCollector(new ConventionCollector(workspaceRoot));
  }

  /**
   * Assemble and write context for a specific skill activation.
   * Returns the path to the written context file.
   */
  async assembleAndWrite(skill: ChalkSkill): Promise<{ filePath: string; result: AssemblyResult }> {
    this.ensureGitignore();

    const result = await this.assembler.assembleForSkill(skill);

    // Write both skill-specific and workspace context in parallel
    const [filePath] = await Promise.all([
      this.writer.writeForSkill(skill.id, result.markdown),
      this.writer.writeWorkspace(result.markdown),
      this.writeEnvBridge(skill),
    ]);

    return { filePath, result };
  }

  /**
   * Assemble and write generic workspace context.
   * Used in background mode.
   */
  async refreshWorkspaceContext(): Promise<AssemblyResult> {
    this.ensureGitignore();

    const result = await this.assembler.assembleWorkspaceContext();
    await this.writer.writeWorkspace(result.markdown);
    return result;
  }

  /** Get current collector statuses for the Context Inspector UI */
  getCollectorStatuses(): CollectorStatus[] {
    return this.assembler.getCollectorStatuses();
  }

  /**
   * Start background context refresh.
   * Only active when settings mode is "background".
   */
  startBackgroundRefresh(): void {
    this.stopBackgroundRefresh();

    const config = vscode.workspace.getConfiguration('chalkSkills.context');
    const mode = config.get<string>('mode', 'on-demand');
    if (mode !== 'background') return;

    const intervalSeconds = config.get<number>('backgroundIntervalSeconds', 30);
    this.backgroundTimer = setInterval(() => {
      this.refreshWorkspaceContext().catch(() => {
        // Silently fail — background refresh is best-effort
      });
    }, intervalSeconds * 1000);

    // Also run immediately
    this.refreshWorkspaceContext().catch(() => {});
  }

  stopBackgroundRefresh(): void {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = undefined;
    }
  }

  private async writeEnvBridge(skill: ChalkSkill): Promise<void> {
    try {
      // Collect key env vars for preamble-based skills
      const { execSync } = await import('child_process');
      let branch = 'unknown';
      try {
        branch = execSync('git branch --show-current', {
          cwd: this.workspaceRoot,
          timeout: 2000,
          encoding: 'utf-8',
        }).trim();
      } catch {
        // Not a git repo
      }

      const diagnosticCount = this.countDiagnostics();

      await this.writer.writeEnvBridge({
        CONTEXT_BRANCH: branch,
        CONTEXT_ERRORS: String(diagnosticCount.errors),
        CONTEXT_WARNINGS: String(diagnosticCount.warnings),
        CONTEXT_SKILL: skill.id,
        CONTEXT_PHASE: skill.phase,
        CONTEXT_FILE: `.chalk/context/${skill.id}.md`,
      });
    } catch {
      // Non-fatal — env bridge is optional
    }
  }

  private countDiagnostics(): { errors: number; warnings: number } {
    const allDiagnostics = vscode.languages.getDiagnostics();
    let errors = 0;
    let warnings = 0;

    for (const [uri, diagnostics] of allDiagnostics) {
      if (!uri.fsPath.startsWith(this.workspaceRoot)) continue;
      for (const diag of diagnostics) {
        if (diag.severity === vscode.DiagnosticSeverity.Error) errors++;
        else if (diag.severity === vscode.DiagnosticSeverity.Warning) warnings++;
      }
    }

    return { errors, warnings };
  }

  private ensureGitignore(): void {
    if (this.gitignoreSetup) return;
    this.writer.ensureGitignore();
    this.gitignoreSetup = true;
  }

  dispose(): void {
    this.stopBackgroundRefresh();
    this.activityCollector.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
