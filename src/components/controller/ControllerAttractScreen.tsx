// src/components/controller/ControllerAttractScreen.tsx
'use client';

import React, { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSoundManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useNarratorContext } from '@/contexts/NarratorContext';
import AccessibilityPanel from '@/components/ui/AccessibilityPanel';

const ControllerAttractScreen: React.FC = () => {
  const store = useGameWithLeaderboard();
  const { soundManager } = useSound();
  const narrator = useNarratorContext();

  useEffect(() => {
    narrator.start([{
      id: 'static_attract',
      cc: "Welcome to Human versus AI! Tap the Start button below to begin your evaluation.",
      text: "Welcome to Human versus A I! Tap the Start button below to begin your evaluation."
    }]);
    
    return () => {
      narrator.stop();
    };
  }, []); // Run exactly once on mount when reaching the Attract screen

  const handleStart = useCallback(() => {
    if (soundManager) {
      soundManager.playSound('gameStart', 0.5);
    }
    narrator.stop();
    // Fresh player every session: never inherit the previous player's initials
    // or arena. START is the only entry into setup, so clearing here guarantees a
    // blank name field whether arriving from a refresh, a new player, or a
    // returning Main Menu. (Identity is also no longer persisted to localStorage.)
    store.setPlayerName('');
    store.setLeafPath(null);
    store.setScreen('nameEntry');
  }, [soundManager, store, narrator]);

  return (
    <div className="screen center relative">
      <AccessibilityPanel />

      {/* Identical Video backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          autoPlay loop muted playsInline
          style={{ filter: 'brightness(0.6) contrast(1.1)' }}
        >
          <source src="/Video/26475-360248610_small.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      </div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2.5rem)] w-full max-w-2xl mx-auto px-8 gap-12 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="font-arcade text-4xl text-glow mb-2">AI vs HUMAN</h1>
          <p className="font-mono text-base text-glow-magenta">KIOSK CONTROLLER</p>
        </motion.div>

        {/* Big START button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onClick={handleStart}
          className="btn-neon btn-neon-green w-full max-w-md py-10 text-4xl font-arcade rounded-lg"
        >
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="block"
          >
            ▶ START
          </motion.span>
        </motion.button>

        {/* Instruction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="font-mono text-sm text-white/50">
            Press START to begin the game. The TV will display the visuals.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ControllerAttractScreen;
