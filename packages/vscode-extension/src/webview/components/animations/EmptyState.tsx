import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  message: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ message, icon = '\u{1F50D}', action }: Props) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-4">
      <motion.div
        className="text-5xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {icon}
      </motion.div>
      <motion.p
        className="text-chalk-dim text-sm font-chalk"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>
      {action && (
        <motion.button
          className="text-xs px-3 py-1.5 rounded-lg bg-board-light text-chalk-dim chalk-border hover:text-chalk transition-colors mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </div>
  );
}
