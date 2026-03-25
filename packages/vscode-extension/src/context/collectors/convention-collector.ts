import * as fs from 'fs';
import * as path from 'path';
import { ContextCollector, ContextSection, COLLECTOR_IDS } from './collector';

interface Conventions {
  naming: string;
  importStyle: string;
  testPattern: string;
  fileStructure: string;
  primaryLanguage: string;
  packageManager: string | null;
}

/**
 * Samples source files to detect project conventions.
 * Results are cached and only re-collected when cache is stale (>5 min).
 */
export class ConventionCollector implements ContextCollector {
  readonly id = COLLECTOR_IDS.CONVENTIONS;
  readonly label = 'Project Conventions';

  private cached: { conventions: Conventions; timestamp: number } | null = null;
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private workspaceRoot: string) {}

  isAvailable(): boolean {
    return true;
  }

  async collect(): Promise<ContextSection> {
    const now = Date.now();

    // Return cached if fresh
    if (this.cached && (now - this.cached.timestamp) < ConventionCollector.CACHE_TTL_MS) {
      return this.formatSection(this.cached.conventions, now);
    }

    const conventions = this.detectConventions();
    this.cached = { conventions, timestamp: now };
    return this.formatSection(conventions, now);
  }

  private formatSection(conv: Conventions, now: number): ContextSection {
    const contentParts: string[] = [];
    contentParts.push(`Primary language: ${conv.primaryLanguage}`);
    if (conv.packageManager) {
      contentParts.push(`Package manager: ${conv.packageManager}`);
    }
    contentParts.push(`Naming convention: ${conv.naming}`);
    contentParts.push(`Import style: ${conv.importStyle}`);
    contentParts.push(`Test pattern: ${conv.testPattern}`);
    contentParts.push(`File structure: ${conv.fileStructure}`);

    return {
      heading: '## Project Conventions',
      content: contentParts.join('\n'),
      freshness: now,
      isEmpty: false,
    };
  }

  private detectConventions(): Conventions {
    const sourceFiles = this.sampleSourceFiles(30);

    return {
      naming: this.detectNaming(sourceFiles),
      importStyle: this.detectImportStyle(sourceFiles),
      testPattern: this.detectTestPattern(),
      fileStructure: this.detectFileStructure(),
      primaryLanguage: this.detectPrimaryLanguage(),
      packageManager: this.detectPackageManager(),
    };
  }

  private detectNaming(files: string[]): string {
    let camelCase = 0;
    let snakeCase = 0;
    let pascalCase = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8').slice(0, 5000); // First 5KB

        // Count function/variable naming patterns
        const camelMatches = content.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g);
        const snakeMatches = content.match(/\b[a-z]+_[a-z_]+\b/g);
        const pascalMatches = content.match(/\b[A-Z][a-z]+[A-Z][a-zA-Z0-9]*\b/g);

        camelCase += camelMatches?.length ?? 0;
        snakeCase += snakeMatches?.length ?? 0;
        pascalCase += pascalMatches?.length ?? 0;
      } catch {
        // Skip unreadable files
      }
    }

    const total = camelCase + snakeCase + pascalCase;
    if (total === 0) return 'Unable to detect';

    const dominant = Math.max(camelCase, snakeCase, pascalCase);
    if (dominant === camelCase) return `camelCase (${Math.round(camelCase / total * 100)}% of identifiers)`;
    if (dominant === snakeCase) return `snake_case (${Math.round(snakeCase / total * 100)}% of identifiers)`;
    return `PascalCase (${Math.round(pascalCase / total * 100)}% of identifiers)`;
  }

  private detectImportStyle(files: string[]): string {
    let relative = 0;
    let absolute = 0;
    let aliased = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8').slice(0, 5000);

        const relativeImports = content.match(/from\s+['"]\.\//g) ?? [];
        const parentImports = content.match(/from\s+['"]\.\.\//g) ?? [];
        const aliasedImports = content.match(/from\s+['"]@\//g) ?? [];
        const absoluteImports = content.match(/from\s+['"][a-zA-Z]/g) ?? [];

        relative += relativeImports.length + parentImports.length;
        aliased += aliasedImports.length;
        absolute += absoluteImports.length;
      } catch {
        // Skip
      }
    }

    const parts: string[] = [];
    if (aliased > 0) parts.push(`aliases (@/) used`);
    if (relative > absolute) parts.push('mostly relative paths');
    else if (absolute > 0) parts.push('mostly bare module imports');

    return parts.length > 0 ? parts.join(', ') : 'Standard module imports';
  }

  private detectTestPattern(): string {
    const patterns: string[] = [];

    if (this.dirExists('__tests__')) patterns.push('__tests__/ directories');
    if (this.dirExists('test')) patterns.push('test/ directory');
    if (this.dirExists('tests')) patterns.push('tests/ directory');
    if (this.dirExists('spec')) patterns.push('spec/ directory');

    // Check for colocated tests
    try {
      const srcDir = this.dirExists('src') ? 'src' : '.';
      const srcFiles = this.listFilesRecursive(path.join(this.workspaceRoot, srcDir), 3);
      const testFiles = srcFiles.filter(f =>
        f.includes('.test.') || f.includes('.spec.') || f.includes('_test.')
      );
      const srcNonTest = srcFiles.filter(f =>
        !f.includes('.test.') && !f.includes('.spec.') && !f.includes('_test.')
      );

      if (testFiles.length > 0 && srcNonTest.length > 0) {
        // Tests are colocated if they share directories with source
        const testDirs = new Set(testFiles.map(f => path.dirname(f)));
        const srcDirs = new Set(srcNonTest.map(f => path.dirname(f)));
        const overlap = [...testDirs].filter(d => srcDirs.has(d));
        if (overlap.length > testDirs.size * 0.5) {
          patterns.push('colocated *.test.* files');
        }
      }
    } catch {
      // Skip
    }

    return patterns.length > 0 ? patterns.join(', ') : 'No test structure detected';
  }

  private detectFileStructure(): string {
    const markers: string[] = [];

    // Feature-based (directories named after features)
    if (this.dirExists('src/features') || this.dirExists('src/modules')) {
      markers.push('feature-based (src/features/ or src/modules/)');
    }
    // Layer-based (directories named after layers)
    else if (this.dirExists('src/components') && this.dirExists('src/services')) {
      markers.push('layer-based (components/, services/, etc.)');
    }
    // App router (Next.js)
    else if (this.dirExists('app') || this.dirExists('src/app')) {
      markers.push('app directory routing');
    }
    // Pages-based (Next.js/Nuxt)
    else if (this.dirExists('pages') || this.dirExists('src/pages')) {
      markers.push('pages-based routing');
    }

    if (this.dirExists('src')) markers.push('src/ root');
    if (this.dirExists('lib')) markers.push('lib/ directory');

    return markers.length > 0 ? markers.join(', ') : 'Flat or non-standard structure';
  }

  private detectPrimaryLanguage(): string {
    const extensions = new Map<string, number>();
    const langMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TypeScript (React)',
      '.js': 'JavaScript', '.jsx': 'JavaScript (React)',
      '.py': 'Python', '.go': 'Go', '.rs': 'Rust',
      '.java': 'Java', '.kt': 'Kotlin', '.swift': 'Swift',
      '.rb': 'Ruby', '.php': 'PHP', '.dart': 'Dart',
      '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
    };

    try {
      const srcDir = this.dirExists('src') ? path.join(this.workspaceRoot, 'src') : this.workspaceRoot;
      const files = this.listFilesRecursive(srcDir, 3);

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (langMap[ext]) {
          extensions.set(ext, (extensions.get(ext) ?? 0) + 1);
        }
      }
    } catch {
      // Fallback
    }

    if (extensions.size === 0) return 'Unknown';

    const sorted = [...extensions.entries()].sort((a, b) => b[1] - a[1]);
    const primary = sorted[0];
    return langMap[primary[0]] ?? 'Unknown';
  }

  private detectPackageManager(): string | null {
    if (this.hasFile('bun.lockb') || this.hasFile('bun.lock')) return 'bun';
    if (this.hasFile('pnpm-lock.yaml')) return 'pnpm';
    if (this.hasFile('yarn.lock')) return 'yarn';
    if (this.hasFile('package-lock.json')) return 'npm';
    if (this.hasFile('Pipfile.lock')) return 'pipenv';
    if (this.hasFile('poetry.lock')) return 'poetry';
    if (this.hasFile('go.sum')) return 'go modules';
    if (this.hasFile('Cargo.lock')) return 'cargo';
    if (this.hasFile('Gemfile.lock')) return 'bundler';
    return null;
  }

  private dirExists(relPath: string): boolean {
    try {
      return fs.statSync(path.join(this.workspaceRoot, relPath)).isDirectory();
    } catch {
      return false;
    }
  }

  private hasFile(relPath: string): boolean {
    try {
      return fs.statSync(path.join(this.workspaceRoot, relPath)).isFile();
    } catch {
      return false;
    }
  }

  private listFilesRecursive(dir: string, maxDepth: number, depth = 0): string[] {
    if (depth >= maxDepth) return [];
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isFile()) results.push(full);
        else if (entry.isDirectory()) results.push(...this.listFilesRecursive(full, maxDepth, depth + 1));
      }
    } catch {
      // Permission denied or other error
    }
    return results;
  }

  private sampleSourceFiles(count: number): string[] {
    const srcDir = this.dirExists('src') ? path.join(this.workspaceRoot, 'src') : this.workspaceRoot;
    const allFiles = this.listFilesRecursive(srcDir, 4);
    const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb']);
    const sourceFiles = allFiles.filter(f => sourceExts.has(path.extname(f).toLowerCase()));

    // Take evenly distributed sample
    if (sourceFiles.length <= count) return sourceFiles;
    const step = Math.floor(sourceFiles.length / count);
    return sourceFiles.filter((_, i) => i % step === 0).slice(0, count);
  }
}
