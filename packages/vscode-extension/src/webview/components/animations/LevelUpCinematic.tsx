import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  levelUp: { oldLevel: number; newLevel: number; title: string } | null;
  onDismiss: () => void;
}

// Chalk dust particles that burst outward
function ChalkDust({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * Math.PI * 2;
  const distance = 60 + Math.random() * 80;
  const size = 3 + Math.random() * 5;
  const colors = ['#e8e4df', '#fde68a', '#fca5a5', '#93c5fd', '#a5d6a7'];

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: colors[index % colors.length],
        left: '50%',
        top: '50%',
        filter: 'blur(0.5px)',
      }}
      initial={{ x: 0, y: 0, opacity: 0.8, scale: 1 }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        opacity: 0,
        scale: 0,
      }}
      transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
    />
  );
}

export function LevelUpCinematic({ levelUp, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (levelUp) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [levelUp]);

  return (
    <AnimatePresence>
      {visible && levelUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => { setVisible(false); onDismiss(); }}
        >
          {/* Chalkboard backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(20, 37, 32, 0.85)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Content */}
          <div className="relative flex flex-col items-center">
            {/* Chalk dust burst */}
            {Array.from({ length: 20 }, (_, i) => (
              <ChalkDust key={i} index={i} total={20} />
            ))}

            {/* Chalk glow ring */}
            <motion.div
              className="absolute w-40 h-40 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(232,228,223,0.2) 0%, transparent 70%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, delay: 0.2 }}
            />

            {/* Level number — chalk-written */}
            <motion.div
              className="text-7xl font-black text-chalk font-chalk"
              style={{
                textShadow: '0 0 30px rgba(232,228,223,0.5), 0 0 60px rgba(232,228,223,0.2)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: 0.15,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              Lv.{levelUp.newLevel}
            </motion.div>

            {/* LEVEL UP text */}
            <motion.div
              className="text-lg font-bold tracking-widest text-chalk-yellow font-chalk chalk-text mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              LEVEL UP!
            </motion.div>

            {/* Title */}
            <motion.div
              className="text-sm text-chalk-dim font-chalk mt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              {levelUp.title}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
