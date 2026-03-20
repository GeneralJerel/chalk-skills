import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ChalkSkill, Phase, ProgressionState } from '../../types';
import { getPhaseInfo, PHASES } from '../../types';
import { getPlayerLevelInfo, getSkillLevelTitle } from '../hooks/useProgression';
import { ProgressRing } from './ProgressRing';
import { AchievementBadge } from './AchievementBadge';
import { ACHIEVEMENTS } from '../../progression';
import { ScrollReveal } from './animations/ScrollReveal';
import { EmptyState } from './animations/EmptyState';
import { postMessage } from '../vscode-api';

interface Props {
  skills: ChalkSkill[];
  progression: ProgressionState | null;
}

function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

function RadarChart({ skills, progression }: { skills: ChalkSkill[]; progression: ProgressionState | null }) {
  const mainPhases: Phase[] = ['foundation', 'design', 'architecture', 'engineering', 'development', 'launch'];
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;

  const phaseData = mainPhases.map((phase, i) => {
    const total = skills.filter(s => s.phase === phase).length;
    const used = skills.filter(s => s.phase === phase && progression?.skillUsage[s.id]).length;
    const ratio = total > 0 ? used / total : 0;
    const angle = (Math.PI * 2 * i) / mainPhases.length - Math.PI / 2;

    return {
      phase,
      ratio,
      x: cx + maxR * ratio * Math.cos(angle),
      y: cy + maxR * ratio * Math.sin(angle),
      labelX: cx + (maxR + 16) * Math.cos(angle),
      labelY: cy + (maxR + 16) * Math.sin(angle),
      axisX: cx + maxR * Math.cos(angle),
      axisY: cy + maxR * Math.sin(angle),
    };
  });

  const points = phaseData.map(d => `${d.x},${d.y}`).join(' ');
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {rings.map(r => {
        const ringPoints = mainPhases.map((_, i) => {
          const angle = (Math.PI * 2 * i) / mainPhases.length - Math.PI / 2;
          return `${cx + maxR * r * Math.cos(angle)},${cy + maxR * r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={r} points={ringPoints} fill="none" stroke="var(--radar-grid)" strokeWidth="1" opacity="0.4" />;
      })}

      {/* Axes */}
      {phaseData.map((d, i) => (
        <line key={i} x1={cx} y1={cy} x2={d.axisX} y2={d.axisY} stroke="var(--radar-grid)" strokeWidth="1" opacity="0.4" />
      ))}

      {/* Data area - animated */}
      <motion.polygon
        points={points}
        fill="var(--radar-area-fill)"
        fillOpacity="0.15"
        stroke="var(--radar-stroke)"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Dots - animated */}
      {phaseData.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={3}
          fill="var(--radar-stroke)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 400 }}
        />
      ))}

      {/* Labels */}
      {phaseData.map((d, i) => (
        <text
          key={i}
          x={d.labelX}
          y={d.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={getPhaseInfo(d.phase).color}
          fontSize="9"
          fontWeight="bold"
        >
          {getPhaseInfo(d.phase).icon}
        </text>
      ))}
    </svg>
  );
}

export function Dashboard({ skills, progression }: Props) {
  if (!progression) {
    return <EmptyState message="Loading progression data..." icon={"\u{23F3}"} />;
  }

  const levelInfo = getPlayerLevelInfo(progression);
  const discoveredCount = Object.keys(progression.skillUsage).length;
  const totalUsages = Object.values(progression.skillUsage).reduce((s, u) => s + u.usageCount, 0);

  const topSkills = useMemo(() => {
    return Object.values(progression.skillUsage)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }, [progression]);

  const maxUsage = topSkills[0]?.usageCount ?? 1;

  const achievementsByCategory = useMemo(() => {
    const grouped: Record<string, typeof ACHIEVEMENTS> = {};
    for (const a of ACHIEVEMENTS) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }
    return grouped;
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => postMessage({ type: 'create:skill' })}
          className="text-xs px-3 py-1.5 rounded-lg bg-board-light text-chalk-dim chalk-border hover:text-chalk transition-colors font-chalk flex items-center gap-1.5"
        >
          <span>+</span> Create Skill
        </button>
      </div>

      {/* Player Profile */}
      <ScrollReveal>
        <div className="bg-board-light rounded-2xl p-6 flex items-center gap-6 chalk-border-light">
          <ProgressRing
            progress={levelInfo.progress}
            size={80}
            strokeWidth={6}
            label={`Lv.${progression.playerLevel}`}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-chalk chalk-heading font-chalk">{levelInfo.current.title}</h1>
            <div className="text-sm text-chalk-dim mt-1">
              <AnimatedCounter value={progression.totalXp} /> XP
              {levelInfo.next && (
                <span className="text-chalk-dim"> / {levelInfo.next.xpRequired.toLocaleString()} XP</span>
              )}
            </div>
            <div className="xp-bar mt-2 h-2">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progress * 100}%` }}
                transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-chalk-dim">
              <span>{discoveredCount} / {skills.length} discovered</span>
              <span>{totalUsages} total uses</span>
              <span>{progression.unlockedAchievements.length} / {ACHIEVEMENTS.length} achievements</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <ScrollReveal delay={0.1}>
          <div className="bg-board-light rounded-2xl p-6 chalk-border-light">
            <h3 className="text-sm font-bold text-chalk-dim mb-3 chalk-heading font-chalk">Phase Coverage</h3>
            <div className="flex justify-center">
              <RadarChart skills={skills} progression={progression} />
            </div>
          </div>
        </ScrollReveal>

        {/* Top Skills Leaderboard */}
        <ScrollReveal delay={0.2}>
          <div className="bg-board-light rounded-2xl p-6 chalk-border-light">
            <h3 className="text-sm font-bold text-chalk-dim mb-3 chalk-heading font-chalk">Most Used Skills</h3>
            {topSkills.length === 0 ? (
              <EmptyState message="No skills used yet. Start exploring!" icon={"\u{1F680}"} />
            ) : (
              <div className="space-y-2">
                {topSkills.map((usage, i) => {
                  const skill = skills.find(s => s.id === usage.skillId);
                  if (!skill) return null;
                  const barWidth = (usage.usageCount / maxUsage) * 100;

                  return (
                    <motion.div
                      key={usage.skillId}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                    >
                      <span className="text-xs text-chalk-dim w-5 text-right">#{i + 1}</span>
                      <div className="flex-1 relative">
                        <motion.div
                          className="absolute inset-0 rounded opacity-20"
                          style={{ background: getPhaseInfo(skill.phase).color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
                        />
                        <div className="relative px-2 py-1 flex items-center justify-between">
                          <span className="text-xs font-medium">{skill.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-chalk-dim">
                              {getSkillLevelTitle(usage.level)}
                            </span>
                            <span className="text-[10px] text-chalk font-bold">
                              {usage.usageCount}x
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* Achievements */}
      <ScrollReveal delay={0.3}>
        <div className="bg-board-light rounded-2xl p-6 chalk-border-light">
          <h3 className="text-sm font-bold text-chalk-dim mb-3 chalk-heading font-chalk">
            Achievements ({progression.unlockedAchievements.length} / {ACHIEVEMENTS.length})
          </h3>
          <div className="space-y-4">
            {Object.entries(achievementsByCategory).map(([category, achievements]) => (
              <div key={category}>
                <div className="text-xs text-chalk-dim uppercase tracking-wider mb-2 font-chalk">{category}</div>
                <div className="flex flex-wrap gap-3">
                  {achievements.map(a => (
                    <AchievementBadge
                      key={a.id}
                      id={a.id}
                      name={a.name}
                      description={a.description}
                      icon={a.icon}
                      category={a.category}
                      unlocked={progression.unlockedAchievements.includes(a.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Activity Timeline */}
      <ScrollReveal delay={0.4}>
        <div className="bg-board-light rounded-2xl p-6 chalk-border-light">
          <h3 className="text-sm font-bold text-chalk-dim mb-3 chalk-heading font-chalk">Recent Activity</h3>
          {progression.activityLog.length === 0 ? (
            <EmptyState message="No activity yet" icon={"\u{1F4DD}"} />
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto scroll-fade">
              {progression.activityLog.slice(0, 20).map((entry, i) => {
                const skill = skills.find(s => s.id === entry.skillId);
                const time = new Date(entry.timestamp);
                return (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 text-xs"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <span className="text-chalk-dim w-24 shrink-0">
                      {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={entry.wasDiscovery ? 'text-chalk font-bold' : 'text-chalk-dim'}>
                      {entry.wasDiscovery ? 'Discovered' : 'Used'} {skill?.name ?? entry.skillId}
                    </span>
                    <span className="text-chalk ml-auto">+{entry.xpEarned} XP</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Skills Per Phase */}
      <ScrollReveal delay={0.5}>
        <div className="bg-board-light rounded-2xl p-6 chalk-border-light">
          <h3 className="text-sm font-bold text-chalk-dim mb-3 chalk-heading font-chalk">Skills by Phase</h3>
          <div className="space-y-2">
            {PHASES.filter(p => skills.some(s => s.phase === p.id)).map((p, i) => {
              const total = skills.filter(s => s.phase === p.id).length;
              const discovered = skills.filter(s => s.phase === p.id && progression.skillUsage[s.id]).length;

              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-sm w-28" style={{ color: p.color }}>{p.icon} {p.label}</span>
                  <div className="flex-1 xp-bar h-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: p.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(discovered / total) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                  </div>
                  <span className="text-xs text-chalk-dim w-12 text-right">{discovered}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
