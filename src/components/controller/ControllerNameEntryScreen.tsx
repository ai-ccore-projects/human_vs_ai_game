// src/components/controller/ControllerNameEntryScreen.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSoundManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';
import InterestDropdown from '@/components/ui/InterestDropDown';
import { useNarratorContext } from '@/contexts/NarratorContext';
import AccessibilityPanel from '@/components/ui/AccessibilityPanel';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

const ControllerNameEntryScreen: React.FC = () => {
  const store = useGameWithLeaderboard();
  const { soundManager } = useSound();
  const { setLeafFolder, resetImages } = useImageManager();
  const narrator = useNarratorContext();
  const [name, setName] = useState(store.playerName || '');
  // Seed from the store so a hot reload / remount restores in-progress setup
  // instead of dropping the player back to a blank screen.
  const [leafPath, setLeafPath] = useState<string | null>(store.leafPath || null);

  useEffect(() => {
    narrator.start([{ id: 'instructions_1', cc: 'Enter your player name to begin and select your interests', text: 'Enter your player name to begin and select your interests' }]);
    return () => { narrator.stop(); };
  }, []);

  const handleCharTap = useCallback(
    (ch: string) => {
      if (name.length >= 3) return;
      const next = name + ch;
      setName(next);
      store.setPlayerName(next);
      if (soundManager) soundManager.playSound('click', 0.3);
    },
    [name, store, soundManager]
  );

  const handleBackspace = useCallback(() => {
    const next = name.slice(0, -1);
    setName(next);
    store.setPlayerName(next);
  }, [name, store]);

  const handleArenaChange = useCallback((path: string) => {
    setLeafPath(path);
    store.setLeafPath(path); // persist so it survives a reset/reload
  }, [store]);

  const handleStartGame = useCallback(async () => {
    if (name.length < 1 || !leafPath) return;
    store.setPlayerName(name.toUpperCase());
    store.setLeafPath(leafPath);

    // Initialize image manager with the chosen arena path
    await setLeafFolder(leafPath);
    resetImages();

    if (soundManager) soundManager.playSound('gameStart', 0.5);
    store.startNewGame();
  }, [name, leafPath, store, soundManager, setLeafFolder, resetImages]);

  const canStart = name.length >= 1 && !!leafPath;

  return (
    <div className="screen relative">
      <AccessibilityPanel />
      {/* Identical Video backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          autoPlay loop muted playsInline
          style={{ filter: 'brightness(0.8) contrast(1.1)' }}
        >
          <source src="/Video/172156-846731269_medium.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
      </div>

      <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-6 py-8 gap-6 min-h-[calc(100vh-2.5rem)] justify-center relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="font-arcade text-3xl text-glow-green mb-1">PLAYER SETUP</h1>
        </motion.div>

        {/* Current name display */}
        <div className="flex justify-center gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-16 h-20 flex items-center justify-center rounded-lg border-4 font-arcade text-4xl transition-all ${
                name[i]
                  ? 'border-green-400 text-white bg-green-900/30 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                  : 'border-gray-600 text-gray-600 bg-gray-900/50'
              }`}
            >
              {name[i] || '_'}
            </div>
          ))}
        </div>

        {/* Character grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <div className="grid grid-cols-6 gap-2 w-full max-w-lg mx-auto">
            {CHARS.map((ch) => (
              <button
                key={ch}
                onClick={() => handleCharTap(ch)}
                disabled={name.length >= 3}
                className="touch-btn font-arcade text-xl rounded-lg border border-cyan-400/40 bg-gray-800 hover:bg-cyan-900/30 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ minHeight: '60px' }}
              >
                {ch}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              disabled={name.length === 0}
              className="touch-btn font-arcade text-xl rounded-lg border border-red-500/50 text-red-400 bg-red-900/20 hover:bg-red-800/30 active:scale-95 transition-all disabled:opacity-30"
              style={{ minHeight: '60px' }}
            >
              ⌫
            </button>
          </div>
        </motion.div>

        {/* Arena selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-lg"
        >
          <InterestDropdown value={leafPath} onChange={handleArenaChange} />
        </motion.div>

        {/* START GAME button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleStartGame}
          disabled={!canStart}
          className="btn-neon btn-neon-green w-full max-w-lg py-6 text-2xl font-arcade rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {canStart ? '▶ START GAME' : 'ENTER NAME + ARENA'}
        </motion.button>
      </div>
    </div>
  );
};

export default ControllerNameEntryScreen;
