'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type HelperStatus = 'idle' | 'thinking' | 'correct' | 'wrong' | 'anxious';

interface ArcadeHelperProps {
  status: HelperStatus;
}

const helperContent: { [key in HelperStatus]: { emoji: string; message: string } } = {
  idle: { emoji: '🤖', message: "Let's do this!" },
  thinking: { emoji: '🤔', message: 'Hmm... analyzing...' },
  correct: { emoji: '🎉', message: 'You got it!' },
  wrong: { emoji: '😢', message: 'Oops! Try again!' },
  anxious: { emoji: '😨', message: 'Time is running out!' },
};

export const ArcadeHelper: React.FC<ArcadeHelperProps> = ({ status }) => {
  const { emoji, message } = helperContent[status];

  return (
    <motion.div
      className="relative"
      key={status}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 10 }}
    >
      <AnimatePresence>
        <motion.div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] bg-white text-black font-arcade text-center text-sm px-4 py-2 rounded-lg border-2 border-black shadow-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {message}
        </motion.div>
      </AnimatePresence>
      <motion.div
        className="text-6xl"
        animate={{
          scale: [1, 1.1, 1],
          rotate: status === 'anxious' ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          scale: { duration: 1, repeat: Infinity },
          rotate: { duration: 0.2, repeat: Infinity },
        }}
      >
        {emoji}
      </motion.div>
    </motion.div>
  );
};
