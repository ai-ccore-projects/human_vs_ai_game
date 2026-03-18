'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNarratorContext } from '@/contexts/NarratorContext';

export const AccessibilityPanel: React.FC = () => {
  const { status, currentCaption, stop } = useNarratorContext();

  return (
    <AnimatePresence>
      {status === 'speaking' && currentCaption && (
        <motion.div
          className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-[100] bg-black/90 border-4 border-cyan-500 rounded-xl p-6 shadow-[0_0_40px_rgba(0,255,255,0.4)] flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
        >
          <div className="flex justify-between w-full items-center border-b border-cyan-900 pb-2">
            <div className="font-mono text-sm text-cyan-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              AUDIO ASSISTANCE
            </div>
            <div className="font-mono text-xs text-gray-400">
              Voice generation by ElevenLabs
            </div>
          </div>
          
          <div className="font-arcade text-3xl text-white text-center leading-relaxed max-w-3xl my-4">
            "{currentCaption}"
          </div>
          
          <button
            onClick={stop}
            className="touch-btn mt-2 font-mono text-sm px-6 py-3 rounded border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 active:scale-95 transition"
          >
            DISMISS / MUTE TTS
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AccessibilityPanel;
