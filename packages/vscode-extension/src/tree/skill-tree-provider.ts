import * as vscode from 'vscode';
import { ChalkSkill, getPhaseInfo, Phase, PHASES, ProgressionState, SKILL_LEVELS } from '../types';

type TreeElement = PhaseNode | SkillNode;

interface PhaseNode {
  type: 'phase';
  phase: Phase;
  skills: ChalkSkill[];
}

interface SkillNode {
  type: 'skill';
  skill: ChalkSkill;
}

export class SkillTreeProvider implements vscode.TreeDataProvider<TreeElement> {
  private _onDidChange = new vscode.EventEmitter<TreeElement | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private skills: ChalkSkill[] = [];
  private progression: ProgressionState | null = null;

  setSkills(skills: ChalkSkill[]) {
    this.skills = skills;
    this._onDidChange.fire(undefined);
  }

  setProgression(progression: ProgressionState) {
    this.progression = progression;
    this._onDidChange.fire(undefined);
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    if (element.type === 'phase') {
      return this.createPhaseItem(element);
    }
    return this.createSkillItem(element);
  }

  getChildren(element?: TreeElement): TreeElement[] {
    if (!element) {
      return this.getPhaseNodes();
    }
    if (element.type === 'phase') {
      return element.skills.map(skill => ({ type: 'skill' as const, skill }));
    }
    return [];
  }

  private getPhaseNodes(): PhaseNode[] {
    const grouped = new Map<Phase, ChalkSkill[]>();

    for (const skill of this.skills) {
      const existing = grouped.get(skill.phase) ?? [];
      existing.push(skill);
      grouped.set(skill.phase, existing);
    }

    return PHASES
      .filter(p => grouped.has(p.id))
      .map(p => ({
        type: 'phase' as const,
        phase: p.id,
        skills: grouped.get(p.id)!.sort((a, b) => a.id.localeCompare(b.id)),
      }));
  }

  private createPhaseItem(node: PhaseNode): vscode.TreeItem {
    const info = getPhaseInfo(node.phase);
    const item = new vscode.TreeItem(
      `${info.icon} ${info.label} (${node.skills.length})`,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.tooltip = `${info.label} — ${node.skills.length} skills`;
    return item;
  }

  private createSkillItem(node: SkillNode): vscode.TreeItem {
    const { skill } = node;
    const usage = this.progression?.skillUsage[skill.id];
    const levelInfo = usage ? SKILL_LEVELS.find(l => l.level === usage.level) : null;
    const levelBadge = levelInfo ? ` Lv.${levelInfo.level}` : '';

    const riskDot = skill.riskLevel === 'high' ? '\u{1F7E3}' :
                    skill.riskLevel === 'medium' ? '\u{1F535}' : '\u26AA';

    const item = new vscode.TreeItem(
      `${riskDot} ${skill.name}${levelBadge}`,
      vscode.TreeItemCollapsibleState.None,
    );
    item.tooltip = new vscode.MarkdownString(
      `**${skill.name}** v${skill.version}\n\n${skill.description}\n\n` +
      (skill.capabilities.length ? `Capabilities: ${skill.capabilities.join(', ')}\n\n` : '') +
      (usage ? `Uses: ${usage.usageCount} | XP: ${usage.totalXp}` : '_Not yet used_'),
    );
    item.command = {
      command: 'chalkSkills.viewSkill',
      title: 'View Skill',
      arguments: [skill.id],
    };

    return item;
  }
}
