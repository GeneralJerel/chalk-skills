import React from 'react';
import type { ChalkSkill, PhaseInfo, ProgressionState } from '../../types';

interface Props {
  phase: PhaseInfo;
  skills: ChalkSkill[];
  progression: ProgressionState | null;
  x: number;
  onSkillClick: (skillId: string) => void;
  hoveredSkill: string | null;
  onHover: (skillId: string | null) => void;
}

const NODE_RADIUS = 18;
const NODE_GAP = 48;
const HEADER_HEIGHT = 40;

export function getColumnHeight(skillCount: number): number {
  return HEADER_HEIGHT + skillCount * NODE_GAP + 20;
}

export function PhaseColumn({ phase, skills, progression, x, onSkillClick, hoveredSkill, onHover }: Props) {
  const discoveredIds = new Set(Object.keys(progression?.skillUsage ?? {}));

  return (
    <g transform={`translate(${x}, 0)`}>
      {/* Phase Header */}
      <text
        x={0}
        y={20}
        textAnchor="middle"
        fill={phase.color}
        fontSize="13"
        fontWeight="bold"
      >
        {phase.icon} {phase.label}
      </text>
      <text
        x={0}
        y={34}
        textAnchor="middle"
        fill="#64748b"
        fontSize="10"
      >
        {skills.length} skills
      </text>

      {/* Skill Nodes */}
      {skills.map((skill, i) => {
        const cy = HEADER_HEIGHT + i * NODE_GAP + NODE_RADIUS;
        const isDiscovered = discoveredIds.has(skill.id);
        const isHovered = hoveredSkill === skill.id;
        const usage = progression?.skillUsage[skill.id];
        const level = usage?.level ?? 0;

        const fillOpacity = isDiscovered ? 0.8 : 0.2;
        const nodeColor = isDiscovered ? phase.color : '#374151';

        return (
          <g
            key={skill.id}
            className="skill-node"
            onClick={() => onSkillClick(skill.id)}
            onMouseEnter={() => onHover(skill.id)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Glow ring for rare/epic */}
            {skill.rarity !== 'common' && isDiscovered && (
              <circle
                cx={0}
                cy={cy}
                r={NODE_RADIUS + 4}
                fill="none"
                stroke={skill.rarity === 'epic' ? '#a855f7' : '#3b82f6'}
                strokeWidth={2}
                opacity={0.4}
                className="animate-glow-pulse"
              />
            )}

            {/* Node circle */}
            <circle
              cx={0}
              cy={cy}
              r={NODE_RADIUS}
              fill={nodeColor}
              fillOpacity={fillOpacity}
              stroke={isHovered ? '#fbbf24' : nodeColor}
              strokeWidth={isHovered ? 2.5 : 1.5}
            />

            {/* Level indicator */}
            {level > 0 && (
              <text
                x={0}
                y={cy + 4}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
              >
                {level}
              </text>
            )}

            {/* Undiscovered question mark */}
            {!isDiscovered && (
              <text
                x={0}
                y={cy + 4}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="14"
              >
                ?
              </text>
            )}

            {/* Skill name label */}
            <text
              x={NODE_RADIUS + 6}
              y={cy + 4}
              fill={isHovered ? '#fbbf24' : '#94a3b8'}
              fontSize="10"
              className="select-none"
            >
              {skill.name}
            </text>

            {/* Tooltip on hover */}
            {isHovered && (
              <g>
                <rect
                  x={-120}
                  y={cy - NODE_RADIUS - 50}
                  width={240}
                  height={40}
                  rx={6}
                  fill="#1a1a2e"
                  stroke="#2a2a4a"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={cy - NODE_RADIUS - 35}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {skill.name}
                </text>
                <text
                  x={0}
                  y={cy - NODE_RADIUS - 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                >
                  {skill.description.slice(0, 60)}{skill.description.length > 60 ? '...' : ''}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export { NODE_GAP, HEADER_HEIGHT, NODE_RADIUS };
