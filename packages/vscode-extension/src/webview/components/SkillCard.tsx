import React from 'react';
import { motion } from 'framer-motion';
import type { ChalkSkill, ProgressionState } from '../../types';
import { getPhaseInfo } from '../../types';
import { getSkillLevelProgress, getSkillLevelTitle } from '../hooks/useProgression';
import { ParticleField } from './animations/ParticleField';

interface Props {
  skill: ChalkSkill;
  progression: ProgressionState | null;
  discovered: boolean;
  onClick?: () => void;
  onRecordUsage?: () => void;
}

/** Deterministic hash for generating unique geometric art per skill */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function GeometricArt({ skillId, color }: { skillId: string; color: string }) {
  const shapes: React.ReactNode[] = [];

  for (let i = 0; i < 5; i++) {
    const seed = hashCode(skillId + i);
    const cx = 10 + (seed % 60);
    const cy = 10 + ((seed >> 4) % 60);
    const r = 8 + (seed % 20);
    const opacity = 0.15 + (seed % 30) / 100;
    const type = seed % 3;

    if (type === 0) {
      shapes.push(
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} opacity={opacity} />,
      );
    } else if (type === 1) {
      shapes.push(
        <rect
          key={i}
          x={cx - r / 2}
          y={cy - r / 2}
          width={r}
          height={r}
          fill={color}
          opacity={opacity}
          transform={`rotate(${seed % 45}, ${cx}, ${cy})`}
        />,
      );
    } else {
      const points = `${cx},${cy - r} ${cx + r * 0.87},${cy + r * 0.5} ${cx - r * 0.87},${cy + r * 0.5}`;
      shapes.push(
        <polygon key={i} points={points} fill={color} opacity={opacity} />,
      );
    }
  }

  return (
    <svg viewBox="0 0 80 80" className="w-full h-full">
      {shapes}
    </svg>
  );
}

export function SkillCard({ skill, progression, discovered, onClick, onRecordUsage }: Props) {
  const phaseInfo = getPhaseInfo(skill.phase);
  const usage = progression?.skillUsage[skill.id];
  const level = usage?.level ?? 0;
  const usageCount = usage?.usageCount ?? 0;
  const levelTitle = level > 0 ? getSkillLevelTitle(level) : 'Undiscovered';
  const levelProgress = level > 0 ? getSkillLevelProgress(usageCount, level) : 0;

  const rarityClass =
    skill.rarity === 'epic' ? 'card-epic chalk-dust holographic' :
    skill.rarity === 'rare' ? 'card-rare chalk-dust' :
    'card-common';

  if (!discovered) {
    return (
      <div
        className="w-[280px] h-[380px] rounded-xl bg-card-bg chalk-border-light flex flex-col items-center justify-center gap-3 cursor-pointer opacity-50"
        onClick={onClick}
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-card-border bg-board-dark flex items-center justify-center text-chalk-dim text-xl">
          ?
        </div>
        <div className="text-sm text-chalk-dim">{skill.name}</div>
        <div className="text-xs text-chalk-dim">Undiscovered</div>
      </div>
    );
  }

  return (
    <div
      className={`w-[280px] h-[380px] rounded-xl bg-card-bg chalk-dust flex flex-col overflow-hidden cursor-pointer relative ${rarityClass}`}
      onClick={onClick}
    >
      {/* Particles for rare/epic */}
      {skill.rarity !== 'common' && (
        <ParticleField rarity={skill.rarity} count={skill.rarity === 'epic' ? 10 : 6} />
      )}

      {/* Phase Header */}
      <div
        className="px-4 py-2 flex items-center justify-between relative z-10"
        style={{ background: `${phaseInfo.color}15` }}
      >
        <span className="text-lg font-chalk chalk-text line-clamp-2">{skill.name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 text-chalk">
          v{skill.version}
        </span>
      </div>

      {/* Geometric Art */}
      <div className="card-art relative z-10" style={{ background: `${phaseInfo.color}10` }}>
        <GeometricArt skillId={skill.id} color={phaseInfo.color} />
      </div>

      {/* Description */}
      <div className="px-4 py-2 flex-1 relative z-10">
        <p className="text-[13px] leading-relaxed text-chalk-dim line-clamp-3">{skill.description}</p>
      </div>

      {/* Capability Tags */}
      <div className="px-4 pb-2 flex flex-wrap gap-1 relative z-10">
        {skill.capabilities.slice(0, 3).map(cap => (
          <span
            key={cap}
            className="text-[11px] px-1.5 py-0.5 rounded-full bg-board text-chalk-dim"
          >
            {cap}
          </span>
        ))}
        {skill.capabilities.length > 3 && (
          <span className="text-[11px] text-chalk-dim">+{skill.capabilities.length - 3}</span>
        )}
      </div>

      {/* Stats Row */}
      <div className="px-4 pb-2 flex items-center gap-2 text-[11px] relative z-10">
        <span
          className="px-1.5 py-0.5 rounded"
          style={{ background: `${phaseInfo.color}15`, color: phaseInfo.color }}
        >
          {phaseInfo.icon} {phaseInfo.label}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-board text-chalk-dim">
          {skill.author}
        </span>
        {skill.allowedTools.length > 0 && (
          <span className="text-chalk-dim ml-auto">
            {skill.allowedTools.length} tools
          </span>
        )}
      </div>

      {/* XP Bar Footer */}
      <div className="px-4 pb-3 pt-1 chalk-border-light relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold" style={{ color: phaseInfo.color }}>
            {levelTitle}
          </span>
          {usage && (
            <span className="text-[11px] text-chalk-dim">
              {usageCount} uses
            </span>
          )}
        </div>
        <div className="xp-bar">
          <motion.div
            className="xp-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${levelProgress * 100}%` }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
        {onRecordUsage && (
          <button
            className="mt-2 w-full text-[11px] py-1 rounded bg-board hover:bg-board-light transition-colors text-chalk"
            onClick={(e) => { e.stopPropagation(); onRecordUsage(); }}
          >
            + Record Usage
          </button>
        )}
      </div>
    </div>
  );
}
