import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChalkSkill, Phase, ProgressionState } from '../../types';
import { getPhaseInfo, PHASES } from '../../types';
import { getSkillLevelTitle } from '../hooks/useProgression';
import { postMessage } from '../vscode-api';

interface Props {
  skills: ChalkSkill[];
  progression: ProgressionState | null;
}

// Floating popup card for skill details — appears near the clicked node
function SkillPopup({
  skill,
  usage,
  onClose,
}: {
  skill: ChalkSkill;
  usage?: { usageCount: number; level: number };
  onClose: () => void;
}) {
  const phaseInfo = getPhaseInfo(skill.phase);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        className="relative w-[320px] max-w-full bg-board-light chalk-border rounded-xl overflow-hidden chalk-dust"
        style={{ boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)' }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Phase color accent bar at top */}
        <div className="h-1" style={{ background: phaseInfo.color }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-chalk font-chalk chalk-text leading-tight">
                {skill.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-chalk"
                  style={{ background: `${phaseInfo.color}15`, color: phaseInfo.color }}
                >
                  {phaseInfo.icon} {phaseInfo.label}
                </span>
                <span className={`text-[10px] font-chalk ${
                  skill.rarity === 'epic' ? 'text-chalk-pink' :
                  skill.rarity === 'rare' ? 'text-chalk-blue' : 'text-chalk-dim'
                }`}>
                  {skill.rarity}
                </span>
                <span className="text-[10px] text-chalk-muted font-chalk">v{skill.version}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-chalk-dim hover:text-chalk text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-board transition-colors"
            >
              {'\u2715'}
            </button>
          </div>

          {/* Description */}
          <p className="text-[13px] text-chalk-dim leading-relaxed mb-4">
            {skill.description}
          </p>

          {/* Stats row */}
          {usage && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-board rounded-lg p-2.5 text-center chalk-border-light">
                <div className="text-[10px] text-chalk-muted font-chalk mb-0.5">Level</div>
                <div className="text-sm font-bold text-chalk font-chalk">{usage.level}</div>
                {usage.level > 0 && (
                  <div className="text-[9px] mt-0.5" style={{ color: phaseInfo.color }}>
                    {getSkillLevelTitle(usage.level)}
                  </div>
                )}
              </div>
              <div className="flex-1 bg-board rounded-lg p-2.5 text-center chalk-border-light">
                <div className="text-[10px] text-chalk-muted font-chalk mb-0.5">Uses</div>
                <div className="text-sm font-bold text-chalk font-chalk">{usage.usageCount}</div>
              </div>
              <div className="flex-1 bg-board rounded-lg p-2.5 text-center chalk-border-light">
                <div className="text-[10px] text-chalk-muted font-chalk mb-0.5">Tools</div>
                <div className="text-sm font-bold text-chalk font-chalk">{skill.allowedTools.length}</div>
              </div>
            </div>
          )}

          {/* Capabilities */}
          {skill.capabilities.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] text-chalk-muted font-chalk mb-1.5">Capabilities</div>
              <div className="flex flex-wrap gap-1">
                {skill.capabilities.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-board text-chalk-dim chalk-border-light">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tools list */}
          <div className="text-[10px] text-chalk-muted mb-4 font-chalk">
            Tools: {skill.allowedTools.join(', ')}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              className="flex-1 text-[11px] py-2 rounded-lg bg-chalk/10 text-chalk hover:bg-chalk/20 transition-colors font-chalk chalk-border font-medium"
              onClick={() => postMessage({ type: 'record:usage', payload: { skillId: skill.id } })}
            >
              + Record
            </button>
            <button
              className="flex-1 text-[11px] py-2 rounded-lg bg-board hover:bg-board-light transition-colors font-chalk chalk-border font-medium"
              onClick={() => postMessage({ type: 'open:skillFile', payload: { filePath: skill.filePath } })}
            >
              Open SKILL.md
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SkillTree({ skills, progression }: Props) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<Phase>>(() => new Set(PHASES.map(p => p.id)));
  const scrollRef = useRef<HTMLDivElement>(null);

  const discoveredIds = useMemo(
    () => new Set(Object.keys(progression?.skillUsage ?? {})),
    [progression],
  );

  const tiers = useMemo(() => {
    const grouped = new Map<Phase, ChalkSkill[]>();
    for (const skill of skills) {
      const list = grouped.get(skill.phase) ?? [];
      list.push(skill);
      grouped.set(skill.phase, list);
    }
    return PHASES
      .filter(p => grouped.has(p.id))
      .map(p => ({
        phase: p,
        skills: grouped.get(p.id)!.sort((a, b) => {
          const ro = { epic: 0, rare: 1, common: 2 };
          return (ro[a.rarity] ?? 2) - (ro[b.rarity] ?? 2) || a.name.localeCompare(b.name);
        }),
      }));
  }, [skills]);

  const scrollToPhase = (phase: Phase) => {
    const el = document.getElementById(`phase-${phase}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const togglePhase = (phase: Phase) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  const handleSkillClick = (skillId: string) => {
    setSelectedSkill(prev => prev === skillId ? null : skillId);
  };

  const selectedNode = selectedSkill ? skills.find(s => s.id === selectedSkill) : null;
  const selectedUsage = selectedNode ? progression?.skillUsage[selectedNode.id] : undefined;

  return (
    <div className="flex flex-col h-full relative">
      {/* Phase jump bar */}
      <div className="flex items-center gap-1 px-4 py-2 chalk-line overflow-x-auto shrink-0">
        <span className="text-[11px] text-chalk-dim mr-2 shrink-0 font-chalk">Jump to:</span>
        {tiers.map(({ phase }) => {
          const info = getPhaseInfo(phase.id);
          const total = skills.filter(s => s.phase === phase.id).length;
          const disc = skills.filter(s => s.phase === phase.id && discoveredIds.has(s.id)).length;
          return (
            <button
              key={phase.id}
              onClick={() => scrollToPhase(phase.id)}
              className="text-[11px] px-2 py-1 rounded-md shrink-0 transition-colors hover:bg-board-light font-chalk"
              style={{ color: info.color }}
            >
              {info.icon} {info.label}
              <span className="ml-1 opacity-50">{disc}/{total}</span>
            </button>
          );
        })}
        <span className="text-[11px] text-chalk-dim ml-auto shrink-0 font-chalk">
          {discoveredIds.size}/{skills.length} unlocked
        </span>
      </div>

      {/* Scrollable tree */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {tiers.map(({ phase, skills: tierSkills }) => {
          const info = getPhaseInfo(phase.id);
          const expanded = expandedPhases.has(phase.id);
          const disc = tierSkills.filter(s => discoveredIds.has(s.id)).length;

          return (
            <div
              key={phase.id}
              id={`phase-${phase.id}`}
              className="rounded-xl overflow-hidden chalk-border"
            >
              {/* Phase header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-board-light"
                style={{ background: `${info.color}06` }}
              >
                <span style={{ color: info.color }} className="text-base">{info.icon}</span>
                <span className="text-sm font-bold font-chalk chalk-text" style={{ color: info.color }}>{info.label}</span>
                <span className="text-[11px] text-chalk-dim font-chalk">{disc}/{tierSkills.length} discovered</span>

                <div className="flex-1 mx-3 xp-bar">
                  <div
                    className="xp-bar-fill transition-all duration-500"
                    style={{
                      width: `${tierSkills.length > 0 ? (disc / tierSkills.length) * 100 : 0}%`,
                      background: info.color,
                      opacity: 0.6,
                    }}
                  />
                </div>

                <span className="text-chalk-dim text-xs">{expanded ? '\u25BC' : '\u25B6'}</span>
              </button>

              {/* Skill grid */}
              {expanded && (
                <div className="px-4 pb-4 pt-2">
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))` }}>
                    {tierSkills.map(skill => {
                      const isDisc = discoveredIds.has(skill.id);
                      const usage = progression?.skillUsage[skill.id];
                      const level = usage?.level ?? 0;
                      const isSel = selectedSkill === skill.id;
                      const glowColor = skill.rarity === 'epic' ? 'var(--rarity-epic-glow)' : skill.rarity === 'rare' ? 'var(--rarity-rare-glow)' : undefined;

                      return (
                        <button
                          key={skill.id}
                          onClick={() => handleSkillClick(skill.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                            isSel
                              ? 'bg-chalk/5 chalk-border'
                              : 'bg-board/50 border border-transparent hover:bg-board-light hover:chalk-border-light'
                          }`}
                        >
                          {/* Node circle */}
                          <div
                            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-chalk relative"
                            style={{
                              background: isDisc ? `${info.color}15` : 'var(--board-dark)',
                              border: `2px dashed ${isDisc ? info.color : 'var(--border-color)'}`,
                              boxShadow: glowColor && isDisc ? `0 0 8px ${glowColor}30` : undefined,
                              color: isDisc ? 'var(--chalk)' : 'var(--chalk-dim)',
                            }}
                          >
                            {isDisc ? (level > 0 ? level : info.icon) : '?'}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-medium truncate ${isDisc ? 'text-chalk' : 'text-chalk-dim'}`}>
                              {skill.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {level > 0 && (
                                <span className="text-[9px] font-chalk" style={{ color: info.color }}>
                                  {getSkillLevelTitle(level)}
                                </span>
                              )}
                              {skill.rarity !== 'common' && (
                                <span className={`text-[9px] font-chalk ${skill.rarity === 'epic' ? 'text-chalk-pink' : 'text-chalk-blue'}`}>
                                  {skill.rarity}
                                </span>
                              )}
                              {!isDisc && (
                                <span className="text-[9px] text-chalk-dim font-chalk">undiscovered</span>
                              )}
                            </div>
                          </div>

                          {/* Usage count */}
                          {usage && (
                            <span className="text-[9px] text-chalk-dim shrink-0 font-chalk">{usage.usageCount}x</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating popup card — appears next to clicked skill */}
      <AnimatePresence>
        {selectedNode && (
          <SkillPopup
            skill={selectedNode}
            usage={selectedUsage ? { usageCount: selectedUsage.usageCount, level: selectedUsage.level } : undefined}
            onClose={() => setSelectedSkill(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
