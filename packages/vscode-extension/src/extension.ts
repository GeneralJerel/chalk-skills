import * as vscode from 'vscode';
import { loadAllSkills } from './skill-loader';
import { SkillTreeProvider } from './tree/skill-tree-provider';
import { loadProgressionState, saveProgressionState } from './persistence';
import { recordSkillUsage } from './progression';
import { ChalkSkill, ExtensionMessage, PLAYER_LEVELS, ProgressionState, WebviewMessage } from './types';
import { AutoRecorder } from './auto-recorder';
import { autoClassifySkills, loadPhaseOverrides, savePhaseOverride } from './auto-indexer';
import { getTfidfClassifier } from './tfidf-classifier';
import { initScaffold, createSkill } from './init-scaffold';

let skills: ChalkSkill[] = [];
let progressionState: ProgressionState;
let treeProvider: SkillTreeProvider;
let currentPanel: vscode.WebviewPanel | undefined;
let autoRecorder: AutoRecorder;

export function activate(context: vscode.ExtensionContext) {
  progressionState = loadProgressionState(context);
  treeProvider = new SkillTreeProvider();

  // Register tree view
  vscode.window.registerTreeDataProvider('chalkSkillTree', treeProvider);

  // Initialize auto-recorder
  autoRecorder = new AutoRecorder({
    onSkillUsed: (skillId, trigger) => {
      handleRecordUsage(context, skillId, true).then(() => {
        if (currentPanel) {
          postToWebview({ type: 'autorecord:triggered', payload: { skillId, trigger } });
        }
      });
    },
  });
  autoRecorder.startWatching();
  context.subscriptions.push(autoRecorder);

  // Load skills
  refreshSkills(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('chalkSkills.openDashboard', () => openWebview(context, 'dashboard')),
    vscode.commands.registerCommand('chalkSkills.openInventory', () => openWebview(context, 'inventory')),
    vscode.commands.registerCommand('chalkSkills.openSkillTree', () => openWebview(context, 'skilltree')),
    vscode.commands.registerCommand('chalkSkills.viewSkill', (skillId: string) => openWebview(context, 'inventory', skillId)),
    vscode.commands.registerCommand('chalkSkills.refreshSkills', () => refreshSkills(context)),
    vscode.commands.registerCommand('chalkSkills.recordUsage', () => pickAndRecordUsage(context)),
    vscode.commands.registerCommand('chalkSkills.init', async () => {
      await initScaffold();
      refreshSkills(context);
    }),
    vscode.commands.registerCommand('chalkSkills.createSkill', async () => {
      const created = await createSkill();
      if (created) refreshSkills(context);
    }),
    vscode.commands.registerCommand('chalkSkills.autoIndex', () => {
      vscode.window.showInformationMessage(
        `Auto-indexed ${skills.filter(s => s.phase !== 'uncategorized').length} / ${skills.length} skills`,
      );
    }),
  );

  // File watcher for SKILL.md changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/SKILL.md');
  watcher.onDidChange(() => refreshSkills(context));
  watcher.onDidCreate(() => refreshSkills(context));
  watcher.onDidDelete(() => refreshSkills(context));
  context.subscriptions.push(watcher);
}

export function deactivate() {
  currentPanel?.dispose();
}

function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders?.[0]?.uri.fsPath;
}

function refreshSkills(context: vscode.ExtensionContext) {
  const root = getWorkspaceRoot();
  if (!root) return;

  const rawSkills = loadAllSkills(root);

  // Train TF-IDF classifier with already-classified skills
  const classifiedSkills = rawSkills.filter(s => s.phase !== 'uncategorized');
  getTfidfClassifier().train(classifiedSkills);

  // Apply auto-classification and user overrides
  const overrides = loadPhaseOverrides(context);
  skills = autoClassifySkills(rawSkills, overrides);

  treeProvider.setSkills(skills);
  treeProvider.setProgression(progressionState);

  // Update auto-recorder with new skills
  autoRecorder.setSkills(skills);

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

async function handleRecordUsage(context: vscode.ExtensionContext, skillId: string, silent = false) {
  const skill = skills.find(s => s.id === skillId);
  if (!skill) return;

  const oldLevel = progressionState.playerLevel;

  const result = recordSkillUsage(progressionState, skillId, skill.riskLevel, skills);
  progressionState = result.state;
  await saveProgressionState(context, progressionState);

  treeProvider.setProgression(progressionState);

  if (currentPanel) {
    postToWebview({ type: 'progression:loaded', payload: progressionState });

    // Detect level-up
    if (progressionState.playerLevel > oldLevel) {
      const levelInfo = PLAYER_LEVELS.find(l => l.level === progressionState.playerLevel);
      postToWebview({
        type: 'level:up',
        payload: {
          oldLevel,
          newLevel: progressionState.playerLevel,
          title: levelInfo?.title ?? 'Unknown',
        },
      });
    }
  }

  // Show achievement notifications
  for (const achievement of result.newAchievements) {
    if (!silent) {
      vscode.window.showInformationMessage(
        `${achievement.icon} Achievement Unlocked: ${achievement.name}! +${achievement.xpReward} XP`,
      );
    }
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

  if (!silent) {
    const levelInfo = result.wasDiscovery ? ' (New Discovery!)' : '';
    vscode.window.showInformationMessage(
      `+${result.xpEarned} XP for ${skill.name}${levelInfo}`,
    );
  }
}

function postToWebview(message: ExtensionMessage) {
  currentPanel?.webview.postMessage(message);
}

function openWebview(context: vscode.ExtensionContext, tab: string, skillId?: string) {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    postToWebview({ type: 'skills:loaded', payload: skills });
    postToWebview({ type: 'progression:loaded', payload: progressionState });
    postToWebview({ type: 'navigate:tab', payload: { tab, skillId } });
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

  currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri, context, tab, skillId);

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
        case 'override:phase':
          await savePhaseOverride(context, message.payload.skillId, message.payload.phase);
          refreshSkills(context);
          break;
        case 'theme:changed':
          context.globalState.update('chalk.theme', message.payload.theme);
          break;
        case 'create:skill':
          vscode.commands.executeCommand('chalkSkills.createSkill');
          break;
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
  context: vscode.ExtensionContext,
  initialTab: string,
  initialSkillId?: string,
): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'));
  const nonce = getNonce();
  const theme = context.globalState.get<string>('chalk.theme', 'dark');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Chalk Skills</title>
</head>
<body data-theme="${theme}">
  <div id="root" data-initial-tab="${initialTab}" data-initial-skill="${initialSkillId ?? ''}" data-theme="${theme}"></div>
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
