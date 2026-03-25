import * as fs from 'fs';
import * as path from 'path';

const CONTEXT_DIR_NAME = '.chalk/context';

export class ContextWriter {
  private contextDir: string;

  constructor(private workspaceRoot: string) {
    this.contextDir = path.join(workspaceRoot, CONTEXT_DIR_NAME);
  }

  /** Write skill-specific context file. Returns the file path. */
  async writeForSkill(skillId: string, markdown: string): Promise<string> {
    this.ensureDir();
    const filePath = path.join(this.contextDir, `${skillId}.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return filePath;
  }

  /** Write generic workspace context. Returns the file path. */
  async writeWorkspace(markdown: string): Promise<string> {
    this.ensureDir();
    const filePath = path.join(this.contextDir, 'workspace.md');
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return filePath;
  }

  /** Write env-var bridge file for preamble-based skills. */
  async writeEnvBridge(vars: Record<string, string>): Promise<string> {
    this.ensureDir();
    const lines = [
      '# Auto-generated workspace context — source this in your preamble',
      `# Generated: ${new Date().toISOString()}`,
      '',
    ];
    for (const [key, value] of Object.entries(vars)) {
      // Shell-safe escaping
      const escaped = value.replace(/'/g, "'\\''");
      lines.push(`export ${key}='${escaped}'`);
    }
    lines.push('');
    const filePath = path.join(this.contextDir, 'env.sh');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return filePath;
  }

  /** Ensure .chalk/context/ is in .gitignore */
  ensureGitignore(): void {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const entry = '.chalk/context/';

    try {
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        if (content.includes(entry)) return; // Already present

        // Append
        const separator = content.endsWith('\n') ? '' : '\n';
        fs.appendFileSync(gitignorePath, `${separator}\n# Auto-generated workspace context (Chalk)\n${entry}\n`);
      } else {
        // Create new .gitignore
        fs.writeFileSync(gitignorePath, `# Auto-generated workspace context (Chalk)\n${entry}\n`);
      }
    } catch {
      // Non-fatal — user can add manually
    }
  }

  private ensureDir(): void {
    fs.mkdirSync(this.contextDir, { recursive: true });
  }
}
