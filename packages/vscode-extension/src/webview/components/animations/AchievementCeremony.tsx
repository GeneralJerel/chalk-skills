import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementData {
  id: string;
  name: string;
  icon: string;
  xpReward: number;
}

interface Props {
  achievement: AchievementData | null;
  onDismiss: () => void;
  defer?: boolean;
}

export function AchievementCeremony({ achievement, onDismiss, defer }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement && !defer) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, defer]);

  return (
    <AnimatePresence>
      {visible && achievement && (
        <motion.div
          className="fixed top-4 right-4 z-[90]"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="bg-board-light chalk-border rounded-2xl px-5 py-4 shadow-2xl relative overflow-hidden chalk-dust">
            {/* Chalk glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(253,230,138,0.08) 0%, transparent 70%)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="relative flex items-center gap-4">
              {/* Badge icon */}
              <motion.div
                className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                style={{
                  border: '2px dashed #fde68a',
                  background: 'rgba(253,230,138,0.08)',
                  boxShadow: '0 0 16px rgba(253,230,138,0.2)',
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                {achievement.icon}
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <div className="text-xs font-chalk font-bold text-chalk-yellow tracking-wider uppercase chalk-text">
                  Achievement Unlocked!
                </div>
                <div className="text-sm font-semibold text-chalk mt-0.5">
                  {achievement.name}
                </div>
                <motion.div
                  className="text-xs text-chalk-yellow/80 mt-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  +{achievement.xpReward} XP
                </motion.div>
              </motion.div>
            </div>

            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-chalk-yellow/50 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
