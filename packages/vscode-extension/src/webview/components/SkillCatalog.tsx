import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCatalog } from '../hooks/useCatalog';
import { getPhaseInfo, PHASES } from '../../types';
import type { Phase } from '../../types';
import type { RegistrySkillEntry, RegistryBundle } from '../../catalog/skill-registry';

type CatalogView = 'bundles' | 'browse';

// ── Bundle Card ──

function BundleCard({
  bundle,
  isSelected,
  onApply,
}: {
  bundle: RegistryBundle;
  isSelected: boolean;
  onApply: () => void;
}) {
  return (
    <motion.div
      className={`chalk-border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-board-light ring-1 ring-chalk-green/40'
          : 'bg-board hover:bg-board-light'
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onApply}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{bundle.icon}</span>
        <div>
          <h3 className="font-chalk font-semibold chalk-text text-sm">{bundle.label}</h3>
          <span className="text-xs text-chalk-dim">
            {bundle.skillIds.length} skills
          </span>
        </div>
        {isSelected && (
          <motion.span
            className="ml-auto text-chalk-green text-xs font-chalk"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            Active
          </motion.span>
        )}
      </div>
      <p className="text-xs text-chalk-dim leading-relaxed">{bundle.description}</p>
    </motion.div>
  );
}

// ── Skill Toggle Row ──

function SkillRow({
  skill,
  enabled,
  onToggle,
}: {
  skill: RegistrySkillEntry;
  enabled: boolean;
  onToggle: () => void;
}) {
  const phase = getPhaseInfo(skill.phase);

  return (
    <motion.div
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-board-light transition-colors group"
      layout
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
          enabled
            ? 'bg-chalk-green/20 border-chalk-green/60'
            : 'border-chalk-dim/40 hover:border-chalk-dim/70'
        }`}
      >
        {enabled && (
          <motion.svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="var(--chalk-green, #4ade80)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-chalk text-sm chalk-text truncate">{skill.id}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-chalk"
            style={{
              color: phase.color,
              backgroundColor: `${phase.color}20`,
            }}
          >
            {phase.icon} {phase.label}
          </span>
        </div>
        <p className="text-xs text-chalk-dim truncate">{skill.description}</p>
      </div>

      {/* Tags */}
      <div className="hidden group-hover:flex gap-1 flex-shrink-0">
        {skill.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-[10px] text-chalk-dim/60 bg-board rounded px-1">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ── Phase Group ──

function PhaseGroup({
  phase,
  skills,
  isEnabled,
  onToggle,
  collapsed,
  onToggleCollapse,
}: {
  phase: Phase;
  skills: RegistrySkillEntry[];
  isEnabled: (id: string) => boolean;
  onToggle: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const info = getPhaseInfo(phase);
  const enabledCount = skills.filter(s => isEnabled(s.id)).length;

  return (
    <div className="mb-3">
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-board-light transition-colors"
      >
        <motion.span
          className="text-chalk-dim text-xs"
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ▼
        </motion.span>
        <span className="text-sm font-chalk" style={{ color: info.color }}>
          {info.icon} {info.label}
        </span>
        <span className="text-xs text-chalk-dim ml-auto">
          {enabledCount}/{skills.length}
        </span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-2 border-l border-chalk-dim/20 pl-1">
              {skills.map(skill => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  enabled={isEnabled(skill.id)}
                  onToggle={() => onToggle(skill.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Catalog Component ──

export function SkillCatalog() {
  const {
    manifest,
    catalogState,
    loading,
    toggleSkill,
    applyBundle,
    isEnabled,
    enabledCount,
  } = useCatalog();

  const [view, setView] = useState<CatalogView>('bundles');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

  const isOnboarded = catalogState && (catalogState.selectedBundle !== null || catalogState.enabledSkills.length > 0);

  // Group skills by phase
  const skillsByPhase = useMemo(() => {
    if (!manifest) return new Map<Phase, RegistrySkillEntry[]>();
    const grouped = new Map<Phase, RegistrySkillEntry[]>();
    for (const skill of manifest.skills) {
      const list = grouped.get(skill.phase) ?? [];
      list.push(skill);
      grouped.set(skill.phase, list);
    }
    return grouped;
  }, [manifest]);

  // Filtered skills for search
  const filteredSkills = useMemo(() => {
    if (!manifest || !searchQuery) return null;
    const q = searchQuery.toLowerCase();
    return manifest.skills.filter(
      s =>
        s.id.includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q)),
    );
  }, [manifest, searchQuery]);

  const toggleCollapse = (phase: string) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  if (loading || !manifest) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          className="text-chalk-dim font-chalk text-sm"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading catalog...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-chalk text-lg chalk-text">Skill Catalog</h1>
          <p className="text-xs text-chalk-dim">
            {manifest.skills.length} skills available — {enabledCount} enabled
          </p>
        </div>

        {/* View toggle */}
        <div className="flex bg-board-light rounded-lg p-0.5 chalk-border">
          {(['bundles', 'browse'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-chalk rounded-md transition-colors ${
                view === v
                  ? 'bg-board chalk-text'
                  : 'text-chalk-dim hover:text-chalk-dim/80'
              }`}
            >
              {v === 'bundles' ? 'Bundles' : 'Browse All'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'bundles' ? (
          <motion.div
            key="bundles"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Onboarding hint */}
            {!isOnboarded && (
              <motion.div
                className="chalk-border rounded-lg p-4 mb-6 bg-board-light"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm chalk-text font-chalk mb-1">Pick a starting bundle</p>
                <p className="text-xs text-chalk-dim">
                  Choose a role bundle to get started quickly, then customize individual skills in Browse All.
                </p>
              </motion.div>
            )}

            {/* Bundle grid */}
            <div className="grid grid-cols-2 gap-3">
              {manifest.bundles.map(bundle => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  isSelected={catalogState?.selectedBundle === bundle.id}
                  onApply={() => applyBundle(bundle.id)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="browse"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search skills by name, description, or tag..."
                className="w-full bg-board-light chalk-border rounded-lg px-3 py-2 text-sm chalk-text font-chalk placeholder:text-chalk-dim/50 focus:outline-none focus:ring-1 focus:ring-chalk-green/30"
              />
            </div>

            {/* Search results or phase groups */}
            {filteredSkills ? (
              <div>
                <p className="text-xs text-chalk-dim mb-2 px-3">
                  {filteredSkills.length} result{filteredSkills.length !== 1 ? 's' : ''}
                </p>
                {filteredSkills.map(skill => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    enabled={isEnabled(skill.id)}
                    onToggle={() => toggleSkill(skill.id)}
                  />
                ))}
              </div>
            ) : (
              <div>
                {PHASES.map(p => {
                  const phaseSkills = skillsByPhase.get(p.id);
                  if (!phaseSkills || phaseSkills.length === 0) return null;
                  return (
                    <PhaseGroup
                      key={p.id}
                      phase={p.id}
                      skills={phaseSkills}
                      isEnabled={isEnabled}
                      onToggle={toggleSkill}
                      collapsed={collapsedPhases.has(p.id)}
                      onToggleCollapse={() => toggleCollapse(p.id)}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
