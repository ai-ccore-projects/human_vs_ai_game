import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboBannerProps {
  combo: number;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ combo }) => {
  const visible = combo >= 2;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={combo}
          initial={{ y: -40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 12 }}
          className="pointer-events-none select-none"
        >
          <motion.div
            className="px-4 py-2 rounded-full font-arcade text-white text-xl border-2"
            animate={{
              backgroundColor: ['#1f2937aa', '#0ea5e9aa', '#a855f7aa', '#22c55eaa', '#1f2937aa'],
              borderColor: ['#22d3ee', '#a855f7', '#22c55e', '#22d3ee'],
              textShadow: ['0 0 10px #22d3ee', '0 0 10px #a855f7', '0 0 10px #22c55e', '0 0 10px #22d3ee'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {`COMBO x${combo}`}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
