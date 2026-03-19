import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { loadAllSkills } from './skill-loader';
import { SkillTreeProvider } from './tree/skill-tree-provider';
import { loadProgressionState, saveProgressionState } from './persistence';
import { recordSkillUsage } from './progression';
import { ChalkSkill, ExtensionMessage, ProgressionState, WebviewMessage } from './types';

let skills: ChalkSkill[] = [];
let progressionState: ProgressionState;
let treeProvider: SkillTreeProvider;
let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  progressionState = loadProgressionState(context);
  treeProvider = new SkillTreeProvider();

  // Register tree view
  vscode.window.registerTreeDataProvider('chalkSkillTree', treeProvider);

  // Load skills
  refreshSkills();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('chalkSkills.openDashboard', () => openWebview(context, 'dashboard')),
    vscode.commands.registerCommand('chalkSkills.openInventory', () => openWebview(context, 'inventory')),
    vscode.commands.registerCommand('chalkSkills.openSkillTree', () => openWebview(context, 'skilltree')),
    vscode.commands.registerCommand('chalkSkills.viewSkill', (skillId: string) => openWebview(context, 'inventory', skillId)),
    vscode.commands.registerCommand('chalkSkills.refreshSkills', () => refreshSkills()),
    vscode.commands.registerCommand('chalkSkills.recordUsage', () => pickAndRecordUsage(context)),
  );

  // File watcher for SKILL.md changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/SKILL.md');
  watcher.onDidChange(() => refreshSkills());
  watcher.onDidCreate(() => refreshSkills());
  watcher.onDidDelete(() => refreshSkills());
  context.subscriptions.push(watcher);
}

export function deactivate() {
  currentPanel?.dispose();
}

function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders?.[0]?.uri.fsPath;
}

function refreshSkills() {
  const root = getWorkspaceRoot();
  if (!root) return;

  skills = loadAllSkills(root);
  treeProvider.setSkills(skills);
  treeProvider.setProgression(progressionState);

  if (currentPanel) {
    postToWebview({ type: 'skills:loaded', payload: skills });
    postToWebview({ type: 'progression:loaded', payload: progressionState });
  }
}

async function pickAndRecordUsage(context: vscode.ExtensionContext) {
  const items = skills.map(s => ({
    label: s.name,
    description: `v${s.version} — ${s.phase}`,
    detail: s.description,
    skillId: s.id,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a skill to record usage',
  });

  if (picked) {
    await handleRecordUsage(context, picked.skillId);
  }
}

async function handleRecordUsage(context: vscode.ExtensionContext, skillId: string) {
  const skill = skills.find(s => s.id === skillId);
  if (!skill) return;

  const result = recordSkillUsage(progressionState, skillId, skill.riskLevel, skills);
  progressionState = result.state;
  await saveProgressionState(context, progressionState);

  treeProvider.setProgression(progressionState);

  if (currentPanel) {
    postToWebview({ type: 'progression:loaded', payload: progressionState });
  }

  // Show achievement notifications
  for (const achievement of result.newAchievements) {
    vscode.window.showInformationMessage(
      `${achievement.icon} Achievement Unlocked: ${achievement.name}! +${achievement.xpReward} XP`,
    );
    if (currentPanel) {
      postToWebview({
        type: 'achievement:unlocked',
        payload: {
          id: achievement.id,
          name: achievement.name,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
        },
      });
    }
  }

  const levelInfo = result.wasDiscovery ? ' (New Discovery!)' : '';
  vscode.window.showInformationMessage(
    `+${result.xpEarned} XP for ${skill.name}${levelInfo}`,
  );
}

function postToWebview(message: ExtensionMessage) {
  currentPanel?.webview.postMessage(message);
}

function openWebview(context: vscode.ExtensionContext, tab: string, skillId?: string) {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    postToWebview({ type: 'skills:loaded', payload: skills });
    postToWebview({ type: 'progression:loaded', payload: progressionState });
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'chalkSkills',
    'Chalk Skills',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
      retainContextWhenHidden: true,
    },
  );

  currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri, tab, skillId);

  currentPanel.webview.onDidReceiveMessage(
    async (message: WebviewMessage) => {
      switch (message.type) {
        case 'request:skills':
          postToWebview({ type: 'skills:loaded', payload: skills });
          break;
        case 'request:progression':
          postToWebview({ type: 'progression:loaded', payload: progressionState });
          break;
        case 'record:usage':
          await handleRecordUsage(context, message.payload.skillId);
          break;
        case 'open:skillFile': {
          const uri = vscode.Uri.file(message.payload.filePath);
          vscode.window.showTextDocument(uri);
          break;
        }
      }
    },
    undefined,
    context.subscriptions,
  );

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  initialTab: string,
  initialSkillId?: string,
): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'));
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Chalk Skills</title>
</head>
<body class="bg-surface text-white">
  <div id="root" data-initial-tab="${initialTab}" data-initial-skill="${initialSkillId ?? ''}"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
