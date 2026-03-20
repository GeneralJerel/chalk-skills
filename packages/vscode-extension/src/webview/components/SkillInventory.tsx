import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ChalkSkill, Phase, ProgressionState, Rarity } from '../../types';
import { getPhaseInfo } from '../../types';
import { SkillCard } from './SkillCard';
import { DEFAULT_FILTERS, FilterBar, Filters } from './FilterBar';
import { postMessage } from '../vscode-api';
import { AnimatedCard } from './animations/AnimatedCard';
import { ModalTransition } from './animations/ModalTransition';
import { EmptyState } from './animations/EmptyState';

interface Props {
  skills: ChalkSkill[];
  progression: ProgressionState | null;
  focusSkillId?: string;
}

const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2 };

export function SkillInventory({ skills, progression, focusSkillId }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(focusSkillId ?? null);

  const discoveredIds = new Set(Object.keys(progression?.skillUsage ?? {}));

  const filtered = useMemo(() => {
    let result = [...skills];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      );
    }
    if (filters.phases.length > 0) {
      result = result.filter(s => filters.phases.includes(s.phase));
    }
    if (filters.rarities.length > 0) {
      result = result.filter(s => filters.rarities.includes(s.rarity));
    }
    if (filters.author !== 'all') {
      result = result.filter(s => s.author === filters.author);
    }

    switch (filters.sort) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'phase':
        result.sort((a, b) => getPhaseInfo(a.phase).order - getPhaseInfo(b.phase).order || a.name.localeCompare(b.name));
        break;
      case 'rarity':
        result.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name));
        break;
      case 'level': {
        const usage = progression?.skillUsage ?? {};
        result.sort((a, b) => (usage[b.id]?.level ?? 0) - (usage[a.id]?.level ?? 0) || a.name.localeCompare(b.name));
        break;
      }
      case 'version':
        result.sort((a, b) => b.version.localeCompare(a.version) || a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [skills, filters, progression]);

  const handleRecordUsage = (skillId: string) => {
    postMessage({ type: 'record:usage', payload: { skillId } });
  };

  const handleOpenFile = (filePath: string) => {
    postMessage({ type: 'open:skillFile', payload: { filePath } });
  };

  const selectedSkillData = selectedSkill ? skills.find(s => s.id === selectedSkill) : null;
  const selectedUsage = selectedSkillData ? progression?.skillUsage[selectedSkillData.id] : undefined;

  return (
    <div className="p-4">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalCount={skills.length}
        discoveredCount={discoveredIds.size}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        <AnimatePresence mode="popLayout">
          {filtered.map((skill, index) => (
            <AnimatedCard key={skill.id} index={index} className="flex justify-center">
              <SkillCard
                skill={skill}
                progression={progression}
                discovered={discoveredIds.has(skill.id)}
                onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)}
                onRecordUsage={() => handleRecordUsage(skill.id)}
              />
            </AnimatedCard>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          message="No skills match your filters"
          action={{ label: 'Clear filters', onClick: () => setFilters(DEFAULT_FILTERS) }}
        />
      )}

      {/* Skill Detail Drawer */}
      <ModalTransition
        open={!!selectedSkillData}
        onClose={() => setSelectedSkill(null)}
      >
        {selectedSkillData && (
          <div
            className="bg-board-light chalk-border rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto chalk-dust"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-chalk chalk-text text-chalk">{selectedSkillData.name}</h2>
              <button onClick={() => setSelectedSkill(null)} className="text-chalk-dim hover:text-chalk">
                X
              </button>
            </div>
            <p className="text-sm text-chalk-dim mb-4">{selectedSkillData.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="bg-board p-2 rounded chalk-border-light">
                <span className="text-chalk-dim">Phase</span>
                <div style={{ color: getPhaseInfo(selectedSkillData.phase).color }}>
                  {getPhaseInfo(selectedSkillData.phase).icon} {getPhaseInfo(selectedSkillData.phase).label}
                </div>
              </div>
              <div className="bg-board p-2 rounded chalk-border-light">
                <span className="text-chalk-dim">Rarity</span>
                <div className={selectedSkillData.rarity === 'epic' ? 'text-chalk-pink' : selectedSkillData.rarity === 'rare' ? 'text-chalk-blue' : 'text-chalk-dim'}>
                  {selectedSkillData.rarity.charAt(0).toUpperCase() + selectedSkillData.rarity.slice(1)}
                </div>
              </div>
              <div className="bg-board p-2 rounded chalk-border-light">
                <span className="text-chalk-dim">Version</span>
                <div className="text-chalk">v{selectedSkillData.version}</div>
              </div>
              <div className="bg-board p-2 rounded chalk-border-light">
                <span className="text-chalk-dim">Uses</span>
                <div className="text-chalk">{selectedUsage?.usageCount ?? 0}</div>
              </div>
            </div>

            {selectedSkillData.capabilities.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-chalk-dim mb-1 font-chalk">Capabilities</div>
                <div className="flex flex-wrap gap-1">
                  {selectedSkillData.capabilities.map(c => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-board text-chalk-dim chalk-border-light">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedSkillData.allowedTools.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-chalk-dim mb-1 font-chalk">Allowed Tools</div>
                <div className="flex flex-wrap gap-1">
                  {selectedSkillData.allowedTools.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-board text-chalk-dim">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="flex-1 py-2 text-sm rounded-lg bg-chalk/10 text-chalk hover:bg-chalk/20 transition-colors font-chalk chalk-border"
                onClick={() => handleRecordUsage(selectedSkillData.id)}
              >
                + Record Usage
              </button>
              <button
                className="flex-1 py-2 text-sm rounded-lg bg-board hover:bg-board-light transition-colors font-chalk chalk-border"
                onClick={() => handleOpenFile(selectedSkillData.filePath)}
              >
                Open SKILL.md
              </button>
            </div>
          </div>
        )}
      </ModalTransition>
    </div>
  );
}
