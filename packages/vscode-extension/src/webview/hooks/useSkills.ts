import { useState, useCallback } from 'react';
import type { ChalkSkill, ProgressionState } from '../../types';
import { useOnMessage, useRequestData } from './useMessages';

interface LevelUpEvent {
  oldLevel: number;
  newLevel: number;
  title: string;
}

interface AutoRecordEvent {
  skillId: string;
  trigger: 'file-read' | 'artifact-change';
}

export function useSkills() {
  const [skills, setSkills] = useState<ChalkSkill[]>([]);
  const [progression, setProgression] = useState<ProgressionState | null>(null);
  const [lastAchievement, setLastAchievement] = useState<{ id: string; name: string; icon: string; xpReward: number } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const [lastAutoRecord, setLastAutoRecord] = useState<AutoRecordEvent | null>(null);
  const [navigateTo, setNavigateTo] = useState<{ tab: string; skillId?: string } | null>(null);

  useRequestData();

  useOnMessage(useCallback((msg) => {
    switch (msg.type) {
      case 'skills:loaded':
        setSkills(msg.payload);
        break;
      case 'progression:loaded':
        setProgression(msg.payload);
        break;
      case 'achievement:unlocked':
        setLastAchievement(msg.payload);
        break;
      case 'level:up':
        setLevelUp(msg.payload);
        break;
      case 'autorecord:triggered':
        setLastAutoRecord(msg.payload);
        setTimeout(() => setLastAutoRecord(null), 3000);
        break;
      case 'navigate:tab':
        setNavigateTo(msg.payload);
        break;
    }
  }, []));

  const dismissAchievement = useCallback(() => setLastAchievement(null), []);
  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  return {
    skills,
    progression,
    lastAchievement,
    dismissAchievement,
    levelUp,
    dismissLevelUp,
    lastAutoRecord,
    navigateTo,
    clearNavigate: useCallback(() => setNavigateTo(null), []),
  };
}
