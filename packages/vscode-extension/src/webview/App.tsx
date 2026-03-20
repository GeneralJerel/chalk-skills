import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSkills } from './hooks/useSkills';
import { Dashboard } from './components/Dashboard';
import { SkillInventory } from './components/SkillInventory';
import { SkillTree } from './components/SkillTree';
import { LevelUpCinematic } from './components/animations/LevelUpCinematic';
import { AchievementCeremony } from './components/animations/AchievementCeremony';
import { postMessage } from './vscode-api';

type Tab = 'dashboard' | 'inventory' | 'skilltree';
type Theme = 'dark' | 'light';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u{1F3AE}' },
  { id: 'inventory', label: 'Inventory', icon: '\u{1F0CF}' },
  { id: 'skilltree', label: 'Skill Tree', icon: '\u{1F333}' },
];

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
}

function useTheme(): [Theme, () => void] {
  const root = document.getElementById('root');
  const initial = (root?.dataset.theme as Theme) ?? 'dark';
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      postMessage({ type: 'theme:changed', payload: { theme: next } });
      return next;
    });
  }, []);

  return [theme, toggle];
}

export function App() {
  const root = document.getElementById('root');
  const initialTab = (root?.dataset.initialTab as Tab) ?? 'dashboard';
  const initialSkill = root?.dataset.initialSkill ?? undefined;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [focusSkillId, setFocusSkillId] = useState<string | undefined>(initialSkill);
  const [theme, toggleTheme] = useTheme();
  const {
    skills,
    progression,
    lastAchievement,
    dismissAchievement,
    levelUp,
    dismissLevelUp,
    lastAutoRecord,
    navigateTo,
    clearNavigate,
  } = useSkills();

  // Handle navigate messages from extension host
  useEffect(() => {
    if (navigateTo) {
      const tab = navigateTo.tab as Tab;
      if (TABS.some(t => t.id === tab)) {
        setActiveTab(tab);
      }
      if (navigateTo.skillId) {
        setFocusSkillId(navigateTo.skillId);
      }
      clearNavigate();
    }
  }, [navigateTo]);

  return (
    <div className="min-h-screen bg-board">
      {/* Level Up Cinematic */}
      <LevelUpCinematic levelUp={levelUp} onDismiss={dismissLevelUp} />

      {/* Achievement Ceremony — deferred if level-up is playing */}
      <AchievementCeremony
        achievement={lastAchievement}
        onDismiss={dismissAchievement}
        defer={!!levelUp}
      />

      {/* Auto-record indicator */}
      <AnimatePresence>
        {lastAutoRecord && (
          <motion.div
            className="fixed top-4 left-4 z-[80]"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
          >
            <div className="bg-board-light chalk-border rounded-lg px-3 py-2 text-xs text-chalk-green flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-chalk-green"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              Auto-recorded: {lastAutoRecord.skillId}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <nav className="flex chalk-line px-4 sticky top-0 bg-board z-40">
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`px-4 py-3 text-sm font-chalk font-medium transition-colors relative ${
              activeTab === tab.id ? 'tab-active chalk-text' : 'tab-inactive'
            }`}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.id && (
              <motion.div
                className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-chalk"
                style={{ boxShadow: '0 0 6px var(--text-glow)' }}
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        ))}

        <div className="ml-auto flex items-center gap-2 px-3">
          <span className="text-xs text-chalk-dim font-chalk">
            {skills.length} skills
          </span>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}
          </button>
        </div>
      </nav>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && (
            <Dashboard skills={skills} progression={progression} />
          )}
          {activeTab === 'inventory' && (
            <SkillInventory
              skills={skills}
              progression={progression}
              focusSkillId={focusSkillId}
            />
          )}
          {activeTab === 'skilltree' && (
            <SkillTree skills={skills} progression={progression} />
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
