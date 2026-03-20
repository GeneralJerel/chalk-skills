import React from 'react';

interface Props {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  discovery: '#22c55e',
  mastery: '#a855f7',
  breadth: '#3b82f6',
  milestone: '#f59e0b',
};

export function AchievementBadge({ name, description, icon, unlocked, category }: Props) {
  const ringColor = CATEGORY_COLORS[category] ?? '#6b7280';

  return (
    <div
      className={`flex flex-col items-center gap-1 p-2 ${
        unlocked
          ? 'badge-unlocked hover:bg-board-light transition-colors rounded-lg'
          : 'badge-locked'
      }`}
      title={`${name}: ${description}`}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl relative"
        style={{
          border: `2px dashed ${unlocked ? ringColor : 'var(--achievement-locked-border)'}`,
          background: unlocked ? `${ringColor}10` : 'var(--achievement-locked-bg)',
          boxShadow: unlocked ? `0 0 10px ${ringColor}25` : 'none',
        }}
      >
        {unlocked ? icon : '\u{1F512}'}
      </div>
      <span className="text-[10px] text-center max-w-[80px] line-clamp-2">
        {unlocked ? name : '???'}
      </span>
    </div>
  );
}
