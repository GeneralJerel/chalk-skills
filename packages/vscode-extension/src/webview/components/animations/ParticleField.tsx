import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Rarity } from '../../../types';

interface Props {
  rarity: Rarity;
  count?: number;
}

const RARITY_COLORS: Record<string, string[]> = {
  epic: ['#a855f7', '#c084fc', '#e879f9', '#f0abfc'],
  rare: ['#3b82f6', '#60a5fa', '#93c5fd', '#38bdf8'],
};

function hashSeed(i: number): number {
  return ((i * 2654435761) >>> 0) % 1000;
}

export function ParticleField({ rarity, count = 8 }: Props) {
  const colors = RARITY_COLORS[rarity];
  if (!colors) return null;

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = hashSeed(i);
      return {
        x: (seed % 90) + 5,
        y: ((seed * 7) % 90) + 5,
        size: 2 + (seed % 4),
        color: colors[seed % colors.length],
        duration: 2.5 + (seed % 20) / 10,
        delay: (seed % 15) / 10,
      };
    });
  }, [rarity, count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            y: [0, -12, 0],
            x: [0, (i % 2 === 0 ? 6 : -6), 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
