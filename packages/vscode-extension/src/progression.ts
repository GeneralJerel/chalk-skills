import {
  Achievement,
  ChalkSkill,
  PLAYER_LEVELS,
  ProgressionState,
  RiskLevel,
  SKILL_LEVELS,
  SkillLevel,
} from './types';

// ── XP Rates ──

const XP_PER_USE: Record<RiskLevel, number> = {
  low: 10,
  unknown: 10,
  medium: 25,
  high: 50,
};

const DISCOVERY_BONUS = 100;

// ── Achievement Definitions ──

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-contact',
    name: 'First Contact',
    description: 'Use any skill for the first time',
    icon: '\u{2B50}',
    category: 'discovery',
    xpReward: 50,
    check: (s) => Object.keys(s.skillUsage).length >= 1,
  },
  {
    id: 'curious-explorer',
    name: 'Curious Explorer',
    description: 'Discover 10 different skills',
    icon: '\u{1F50D}',
    category: 'discovery',
    xpReward: 200,
    check: (s) => Object.keys(s.skillUsage).length >= 10,
  },
  {
    id: 'skill-collector',
    name: 'Skill Collector',
    description: 'Discover 25 different skills',
    icon: '\u{1F3C6}',
    category: 'discovery',
    xpReward: 500,
    check: (s) => Object.keys(s.skillUsage).length >= 25,
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Discover all skills',
    icon: '\u{1F451}',
    category: 'discovery',
    xpReward: 2000,
    check: (s, skills) => Object.keys(s.skillUsage).length >= skills.length,
  },
  {
    id: 'dedicated-practitioner',
    name: 'Dedicated Practitioner',
    description: 'Reach Adept (Level 3) on any skill',
    icon: '\u{1F4AA}',
    category: 'mastery',
    xpReward: 300,
    check: (s) => Object.values(s.skillUsage).some(u => u.level >= 3),
  },
  {
    id: 'true-master',
    name: 'True Master',
    description: 'Reach Master (Level 5) on any skill',
    icon: '\u{1F9D9}',
    category: 'mastery',
    xpReward: 1000,
    check: (s) => Object.values(s.skillUsage).some(u => u.level >= 5),
  },
  {
    id: 'full-stack',
    name: 'Full Stack',
    description: 'Use at least one skill from every phase',
    icon: '\u{1F30D}',
    category: 'breadth',
    xpReward: 1000,
    check: (s, skills) => {
      const phases = new Set<string>();
      for (const id of Object.keys(s.skillUsage)) {
        const skill = skills.find(sk => sk.id === id);
        if (skill) phases.add(skill.phase);
      }
      const mainPhases = ['foundation', 'design', 'architecture', 'engineering', 'development', 'launch'];
      return mainPhases.every(p => phases.has(p));
    },
  },
  {
    id: 'documentation-hero',
    name: 'Documentation Hero',
    description: 'Use 5 different documentation skills',
    icon: '\u{1F4DD}',
    category: 'breadth',
    xpReward: 500,
    check: (s) => {
      const docSkills = ['create-doc', 'update-doc', 'setup-docs', 'product-context-docs', 'create-handoff'];
      return docSkills.filter(id => s.skillUsage[id]).length >= 5;
    },
  },
  {
    id: 'review-champion',
    name: 'Review Champion',
    description: 'Use all review skills',
    icon: '\u{1F50E}',
    category: 'breadth',
    xpReward: 750,
    check: (s) => {
      const reviewSkills = ['review-changes', 'review-code', 'review-prd', 'create-review', 'fix-review', 'fix-findings'];
      return reviewSkills.every(id => s.skillUsage[id]);
    },
  },
  {
    id: 'first-100-xp',
    name: 'First 100 XP',
    description: 'Earn 100 total XP',
    icon: '\u{1F4AB}',
    category: 'milestone',
    xpReward: 25,
    check: (s) => s.totalXp >= 100,
  },
  {
    id: 'xp-thousandaire',
    name: 'XP Thousandaire',
    description: 'Earn 1,000 total XP',
    icon: '\u{1F4B0}',
    category: 'milestone',
    xpReward: 100,
    check: (s) => s.totalXp >= 1000,
  },
  {
    id: 'power-user',
    name: 'Power User',
    description: 'Record 100 total skill usages',
    icon: '\u{26A1}',
    category: 'milestone',
    xpReward: 500,
    check: (s) => {
      const total = Object.values(s.skillUsage).reduce((sum, u) => sum + u.usageCount, 0);
      return total >= 100;
    },
  },
];

// ── Core Logic ──

export function createInitialState(): ProgressionState {
  return {
    version: 1,
    totalXp: 0,
    playerLevel: 1,
    skillUsage: {},
    unlockedAchievements: [],
    activityLog: [],
    firstSeenTimestamp: Date.now(),
  };
}

export function computeSkillLevel(usageCount: number): SkillLevel {
  for (let i = SKILL_LEVELS.length - 1; i >= 0; i--) {
    if (usageCount >= SKILL_LEVELS[i].usesRequired) {
      return SKILL_LEVELS[i].level;
    }
  }
  return 1;
}

export function computePlayerLevel(totalXp: number): number {
  for (let i = PLAYER_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= PLAYER_LEVELS[i].xpRequired) {
      return PLAYER_LEVELS[i].level;
    }
  }
  return 1;
}

export interface UsageResult {
  state: ProgressionState;
  xpEarned: number;
  wasDiscovery: boolean;
  newAchievements: Achievement[];
}

export function recordSkillUsage(
  state: ProgressionState,
  skillId: string,
  riskLevel: RiskLevel,
  allSkills: ChalkSkill[],
): UsageResult {
  const now = Date.now();
  const isDiscovery = !state.skillUsage[skillId];
  const baseXp = XP_PER_USE[riskLevel];
  const discoveryXp = isDiscovery ? DISCOVERY_BONUS : 0;
  let xpEarned = baseXp + discoveryXp;

  // Update skill usage
  const existing = state.skillUsage[skillId];
  const newCount = (existing?.usageCount ?? 0) + 1;
  const newSkillXp = (existing?.totalXp ?? 0) + baseXp;

  const updatedUsage: typeof state.skillUsage = {
    ...state.skillUsage,
    [skillId]: {
      skillId,
      usageCount: newCount,
      totalXp: newSkillXp,
      level: computeSkillLevel(newCount),
      firstUsed: existing?.firstUsed ?? now,
      lastUsed: now,
    },
  };

  const newTotalXp = state.totalXp + xpEarned;

  // Check achievements before adding achievement XP
  const preState: ProgressionState = {
    ...state,
    totalXp: newTotalXp,
    skillUsage: updatedUsage,
  };

  const newAchievements = ACHIEVEMENTS.filter(
    a => !state.unlockedAchievements.includes(a.id) && a.check(preState, allSkills),
  );

  // Add achievement XP
  const achievementXp = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
  xpEarned += achievementXp;
  const finalTotalXp = newTotalXp + achievementXp;

  const newState: ProgressionState = {
    ...state,
    totalXp: finalTotalXp,
    playerLevel: computePlayerLevel(finalTotalXp),
    skillUsage: updatedUsage,
    unlockedAchievements: [
      ...state.unlockedAchievements,
      ...newAchievements.map(a => a.id),
    ],
    activityLog: [
      { skillId, timestamp: now, xpEarned, wasDiscovery: isDiscovery },
      ...state.activityLog,
    ].slice(0, 100),
  };

  return { state: newState, xpEarned, wasDiscovery: isDiscovery, newAchievements };
}
