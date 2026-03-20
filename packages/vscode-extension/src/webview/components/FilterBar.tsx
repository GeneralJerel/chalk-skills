import React from 'react';
import type { Phase, Rarity } from '../../types';
import { PHASES } from '../../types';

export interface Filters {
  search: string;
  phases: Phase[];
  rarities: Rarity[];
  author: 'all' | 'chalk' | 'project';
  sort: 'name' | 'phase' | 'rarity' | 'level' | 'version';
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  phases: [],
  rarities: [],
  author: 'all',
  sort: 'phase',
};

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  totalCount: number;
  discoveredCount: number;
}

export function FilterBar({ filters, onChange, totalCount, discoveredCount }: Props) {
  const togglePhase = (phase: Phase) => {
    const phases = filters.phases.includes(phase)
      ? filters.phases.filter(p => p !== phase)
      : [...filters.phases, phase];
    onChange({ ...filters, phases });
  };

  const toggleRarity = (rarity: Rarity) => {
    const rarities = filters.rarities.includes(rarity)
      ? filters.rarities.filter(r => r !== rarity)
      : [...filters.rarities, rarity];
    onChange({ ...filters, rarities });
  };

  return (
    <div className="space-y-3 p-4 bg-board-light rounded-xl mb-4">
      {/* Discovery Counter */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-chalk">
          {discoveredCount} / {totalCount} Skills Discovered
        </span>
        <div className="xp-bar w-32">
          <div
            className="xp-bar-fill"
            style={{ width: `${totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search skills..."
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="w-full px-3 py-1.5 text-sm bg-board chalk-border rounded-lg text-chalk placeholder-chalk-dim focus:outline-none focus:border-xp-bar"
      />

      {/* Phase Toggles */}
      <div className="flex flex-wrap gap-1">
        {PHASES.map(p => {
          const isActive = filters.phases.length === 0 || filters.phases.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => togglePhase(p.id)}
              className={`text-[11px] px-2 py-0.5 rounded-full transition-colors font-chalk ${
                isActive ? 'text-chalk filter-active' : 'text-chalk-dim'
              }`}
              style={{
                background: isActive ? `${p.color}30` : 'transparent',
                border: `1px solid ${p.color}40`,
              }}
            >
              {p.icon} {p.label}
            </button>
          );
        })}
      </div>

      {/* Rarity + Owner + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {([
            { id: 'common' as Rarity, label: 'Common', color: '#9ca3af' },
            { id: 'rare' as Rarity, label: 'Rare', color: '#3b82f6' },
            { id: 'epic' as Rarity, label: 'Epic', color: '#a855f7' },
          ]).map(r => {
            const isActive = filters.rarities.length === 0 || filters.rarities.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggleRarity(r.id)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors font-chalk ${
                  isActive ? 'text-chalk filter-active' : 'text-chalk-dim'
                }`}
                style={{
                  borderColor: `${r.color}60`,
                  background: isActive ? `${r.color}20` : 'transparent',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <select
          value={filters.author}
          onChange={e => onChange({ ...filters, author: e.target.value as Filters['author'] })}
          className="text-[11px] px-2 py-0.5 rounded bg-board text-chalk chalk-border"
        >
          <option value="all">All Authors</option>
          <option value="chalk">Chalk</option>
          <option value="project">Project</option>
        </select>

        <select
          value={filters.sort}
          onChange={e => onChange({ ...filters, sort: e.target.value as Filters['sort'] })}
          className="text-[11px] px-2 py-0.5 rounded bg-board text-chalk chalk-border"
        >
          <option value="phase">Sort by Phase</option>
          <option value="name">Sort by Name</option>
          <option value="rarity">Sort by Rarity</option>
          <option value="level">Sort by Level</option>
          <option value="version">Sort by Version</option>
        </select>
      </div>
    </div>
  );
}
