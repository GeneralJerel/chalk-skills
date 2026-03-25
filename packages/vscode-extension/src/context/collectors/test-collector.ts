import * as fs from 'fs';
import * as path from 'path';
import { ContextCollector, ContextSection, COLLECTOR_IDS } from './collector';

interface TestSummary {
  runner: string;
  passed: number;
  failed: number;
  skipped: number;
  failingTests: string[];
  coverage?: number;
  lastRunTimestamp?: number;
}

export class TestCollector implements ContextCollector {
  readonly id = COLLECTOR_IDS.TEST_RESULTS;
  readonly label = 'Test Results';

  constructor(private workspaceRoot: string) {}

  isAvailable(): boolean {
    // Check if any common test output locations exist
    return (
      this.hasFile('coverage') ||
      this.hasFile('.test-results') ||
      this.hasFile('test-results.json') ||
      this.hasFile('jest.config.js') ||
      this.hasFile('jest.config.ts') ||
      this.hasFile('vitest.config.ts') ||
      this.hasFile('vitest.config.js') ||
      this.hasFile('pytest.ini') ||
      this.hasFile('pyproject.toml') ||
      this.hasFile('.mocharc.yml') ||
      this.hasFile('.mocharc.json')
    );
  }

  async collect(): Promise<ContextSection> {
    const now = Date.now();
    const summary = this.gatherTestResults();

    if (!summary) {
      return {
        heading: '## Test Results',
        content: 'No test results found. Run your test suite to populate this section.',
        freshness: now,
        isEmpty: true,
      };
    }

    const contentParts: string[] = [];
    contentParts.push(`Runner: ${summary.runner}`);

    if (summary.lastRunTimestamp) {
      const ago = this.timeAgo(now - summary.lastRunTimestamp);
      contentParts.push(`Last run: ${ago}`);
    }

    const total = summary.passed + summary.failed + summary.skipped;
    contentParts.push(`Result: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped (${total} total)`);

    if (summary.failed > 0 && summary.failingTests.length > 0) {
      contentParts.push('Failing:');
      for (const test of summary.failingTests.slice(0, 20)) {
        contentParts.push(`  - ${test}`);
      }
      if (summary.failingTests.length > 20) {
        contentParts.push(`  ... and ${summary.failingTests.length - 20} more`);
      }
    }

    if (summary.coverage !== undefined) {
      contentParts.push(`Coverage: ${summary.coverage.toFixed(1)}%`);
    }

    return {
      heading: '## Test Results',
      content: contentParts.join('\n'),
      freshness: now,
      isEmpty: false,
    };
  }

  private gatherTestResults(): TestSummary | null {
    // Try Jest JSON results
    const jestResult = this.tryJestResults();
    if (jestResult) return jestResult;

    // Try Vitest JSON results
    const vitestResult = this.tryVitestResults();
    if (vitestResult) return vitestResult;

    // Try coverage summary (framework-agnostic)
    const coverageResult = this.tryCoverageSummary();
    if (coverageResult) return coverageResult;

    return null;
  }

  private tryJestResults(): TestSummary | null {
    const paths = [
      'test-results.json',
      '.test-results/results.json',
      'jest-results.json',
    ];

    for (const relPath of paths) {
      const fullPath = path.join(this.workspaceRoot, relPath);
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(raw);

        if (data.numPassedTests !== undefined) {
          const failingTests: string[] = [];
          if (data.testResults) {
            for (const suite of data.testResults) {
              if (suite.status === 'failed') {
                for (const assertion of suite.assertionResults ?? []) {
                  if (assertion.status === 'failed') {
                    const name = assertion.ancestorTitles
                      ? [...assertion.ancestorTitles, assertion.title].join(' > ')
                      : assertion.fullName ?? assertion.title;
                    failingTests.push(name);
                  }
                }
              }
            }
          }

          return {
            runner: 'Jest',
            passed: data.numPassedTests ?? 0,
            failed: data.numFailedTests ?? 0,
            skipped: data.numPendingTests ?? 0,
            failingTests,
            lastRunTimestamp: data.startTime ? data.startTime : this.getFileMtime(fullPath),
          };
        }
      } catch {
        // Not found or invalid, try next
      }
    }
    return null;
  }

  private tryVitestResults(): TestSummary | null {
    const paths = [
      '.vitest-results/results.json',
      'vitest-results.json',
    ];

    for (const relPath of paths) {
      const fullPath = path.join(this.workspaceRoot, relPath);
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(raw);

        if (data.testResults) {
          let passed = 0;
          let failed = 0;
          let skipped = 0;
          const failingTests: string[] = [];

          for (const suite of data.testResults) {
            for (const test of suite.assertionResults ?? []) {
              if (test.status === 'passed') passed++;
              else if (test.status === 'failed') {
                failed++;
                failingTests.push(test.fullName ?? test.title);
              } else skipped++;
            }
          }

          return {
            runner: 'Vitest',
            passed,
            failed,
            skipped,
            failingTests,
            lastRunTimestamp: this.getFileMtime(fullPath),
          };
        }
      } catch {
        // Not found or invalid
      }
    }
    return null;
  }

  private tryCoverageSummary(): TestSummary | null {
    const coveragePath = path.join(this.workspaceRoot, 'coverage', 'coverage-summary.json');
    try {
      const raw = fs.readFileSync(coveragePath, 'utf-8');
      const data = JSON.parse(raw);

      if (data.total?.lines?.pct !== undefined) {
        return {
          runner: 'Unknown (coverage only)',
          passed: 0,
          failed: 0,
          skipped: 0,
          failingTests: [],
          coverage: data.total.lines.pct,
          lastRunTimestamp: this.getFileMtime(coveragePath),
        };
      }
    } catch {
      // Not found
    }
    return null;
  }

  private hasFile(relPath: string): boolean {
    try {
      fs.accessSync(path.join(this.workspaceRoot, relPath));
      return true;
    } catch {
      return false;
    }
  }

  private getFileMtime(fullPath: string): number | undefined {
    try {
      return fs.statSync(fullPath).mtimeMs;
    } catch {
      return undefined;
    }
  }

  private timeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
