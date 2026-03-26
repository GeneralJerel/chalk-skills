import * as vscode from 'vscode';
import * as path from 'path';
import { ContextCollector, ContextSection, COLLECTOR_IDS } from './collector';

export class DiagnosticsCollector implements ContextCollector {
  readonly id = COLLECTOR_IDS.DIAGNOSTICS;
  readonly label = 'Diagnostics';

  constructor(private workspaceRoot: string) {}

  isAvailable(): boolean {
    return true; // VSCode diagnostics are always available
  }

  async collect(): Promise<ContextSection> {
    const now = Date.now();
    const allDiagnostics = vscode.languages.getDiagnostics();

    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    for (const [uri, diagnostics] of allDiagnostics) {
      // Only include workspace files
      if (!uri.fsPath.startsWith(this.workspaceRoot)) continue;
      // Skip node_modules, dist, build, etc.
      const relPath = path.relative(this.workspaceRoot, uri.fsPath);
      if (relPath.startsWith('node_modules') || relPath.startsWith('dist') || relPath.startsWith('.git')) continue;

      for (const diag of diagnostics) {
        const line = diag.range.start.line + 1;
        const entry = `${relPath}:${line} — ${diag.message}`;
        const source = diag.source ? ` [${diag.source}]` : '';

        switch (diag.severity) {
          case vscode.DiagnosticSeverity.Error:
            errors.push(`  - ERROR ${entry}${source}`);
            break;
          case vscode.DiagnosticSeverity.Warning:
            warnings.push(`  - WARN ${entry}${source}`);
            break;
          case vscode.DiagnosticSeverity.Information:
            infos.push(`  - INFO ${entry}${source}`);
            break;
          // Hints are too noisy, skip them
        }
      }
    }

    const contentParts: string[] = [];

    if (errors.length > 0) {
      contentParts.push(`Errors (${errors.length}):`);
      contentParts.push(errors.slice(0, 25).join('\n'));
      if (errors.length > 25) {
        contentParts.push(`  ... and ${errors.length - 25} more errors`);
      }
    }

    if (warnings.length > 0) {
      contentParts.push(`Warnings (${warnings.length}):`);
      contentParts.push(warnings.slice(0, 15).join('\n'));
      if (warnings.length > 15) {
        contentParts.push(`  ... and ${warnings.length - 15} more warnings`);
      }
    }

    if (infos.length > 0) {
      contentParts.push(`Info (${infos.length}):`);
      contentParts.push(infos.slice(0, 10).join('\n'));
      if (infos.length > 10) {
        contentParts.push(`  ... and ${infos.length - 10} more`);
      }
    }

    if (contentParts.length === 0) {
      contentParts.push('No issues detected in workspace.');
    }

    return {
      heading: '## Current Issues',
      content: contentParts.join('\n'),
      freshness: now,
      isEmpty: errors.length === 0 && warnings.length === 0 && infos.length === 0,
    };
  }
}
