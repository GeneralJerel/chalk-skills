import { useState, useCallback, useEffect } from 'react';
import type { ExtensionMessage } from '../../types';
import type { RegistryManifest, RegistrySkillEntry, RegistryBundle } from '../../catalog/skill-registry';
import type { CatalogState } from '../../catalog/skill-activation';
import { onMessage, postMessage } from '../vscode-api';

export function useCatalog() {
  const [manifest, setManifest] = useState<RegistryManifest | null>(null);
  const [catalogState, setCatalogState] = useState<CatalogState | null>(null);
  const [loading, setLoading] = useState(true);

  // Request catalog data on mount
  useEffect(() => {
    postMessage({ type: 'catalog:request' });
  }, []);

  // Listen for catalog messages
  useEffect(() => {
    const handler = (msg: ExtensionMessage) => {
      switch (msg.type) {
        case 'catalog:loaded':
          setManifest(msg.payload);
          setLoading(false);
          break;
        case 'catalog:state':
          setCatalogState(msg.payload);
          break;
        case 'catalog:skillToggled':
          // Optimistic update
          setCatalogState(prev => {
            if (!prev) return prev;
            const enabled = new Set(prev.enabledSkills);
            if (msg.payload.enabled) {
              enabled.add(msg.payload.skillId);
            } else {
              enabled.delete(msg.payload.skillId);
            }
            return { ...prev, enabledSkills: Array.from(enabled).sort() };
          });
          break;
        case 'catalog:bundleApplied':
          setCatalogState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              selectedBundle: msg.payload.bundleId,
              enabledSkills: msg.payload.skillIds,
            };
          });
          break;
      }
    };
    onMessage(handler);
  }, []);

  const toggleSkill = useCallback((skillId: string) => {
    postMessage({ type: 'catalog:toggleSkill', payload: { skillId } });
  }, []);

  const applyBundle = useCallback((bundleId: string) => {
    postMessage({ type: 'catalog:applyBundle', payload: { bundleId } });
  }, []);

  const enableMany = useCallback((skillIds: string[]) => {
    postMessage({ type: 'catalog:enableMany', payload: { skillIds } });
  }, []);

  const clearAll = useCallback(() => {
    postMessage({ type: 'catalog:clearAll' });
  }, []);

  const isEnabled = useCallback((skillId: string): boolean => {
    return catalogState?.enabledSkills.includes(skillId) ?? false;
  }, [catalogState]);

  const enabledCount = catalogState?.enabledSkills.length ?? 0;

  return {
    manifest,
    catalogState,
    loading,
    toggleSkill,
    applyBundle,
    enableMany,
    clearAll,
    isEnabled,
    enabledCount,
  };
}
