// src/components/controller/ControllerGameOverScreen.tsx
'use client';

import React, { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSoundManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useNarratorContext } from '@/contexts/NarratorContext';
import AccessibilityPanel from '@/components/ui/AccessibilityPanel';
import { GAME_OVER_NARRATION } from '@/utils/narrationScript';
import { useSubmitScore } from '@/hooks/useSubmitScore';
import { useHighScores } from '@/hooks/useHighScore';

const ControllerGameOverScreen: React.FC = () => {
  const store = useGameWithLeaderboard();
  const { soundManager } = useSound();
  const narrator = useNarratorContext();
  const stats = store.getStats();

  const { submit } = useSubmitScore();
  const { items: globalLeaderboard } = useHighScores();
  const hasSubmitted = React.useRef(false);

  useEffect(() => {
    narrator.start(GAME_OVER_NARRATION);
    return () => { narrator.stop(); };
  }, []);

  // Submit score once on mount
  useEffect(() => {
    if (!hasSubmitted.current && store.gameId && store.playerName) {
      hasSubmitted.current = true;
      submit({
        gameId: store.gameId,
        name: store.playerName,
        score: store.score,
        round: store.round,
        maxCombo: store.maxCombo,
      });
    }
  }, [store.gameId, store.playerName, store.score, store.round, store.maxCombo, submit]);

  // Sync global leaderboard to local store (for TV sync).
  // Depend ONLY on the fetched data — `store` changes identity every render, so
  // including it here would re-write the leaderboard on every render and loop.
  useEffect(() => {
    if (globalLeaderboard && globalLeaderboard.length > 0) {
      store.setLeaderboard(globalLeaderboard.map(item => ({
        name: item.name,
        score: item.score,
        round: item.round,
        maxCombo: item.maxCombo,
        date: new Date(item.createdAt).toISOString(),
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalLeaderboard]);

  const handlePlayAgain = useCallback(() => {
    if (soundManager) soundManager.playSound('gameStart', 0.5);
    store.startNewGame();
  }, [store, soundManager]);

  const handleMainMenu = useCallback(() => {
    if (soundManager) soundManager.playSound('click', 0.3);
    store.setScreen('attract');
  }, [store, soundManager]);

  return (
    <div className="screen center">
      <AccessibilityPanel />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2.5rem)] w-full max-w-2xl mx-auto px-6 gap-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h1 className="font-arcade text-4xl text-red-500 mb-2">GAME OVER</h1>
        </motion.div>

        {/* Score summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="arcade-border rounded-lg p-6 w-full text-center"
        >
          <div className="font-arcade text-5xl text-yellow-400 mb-4">
            {store.score.toLocaleString()}
          </div>
          <div className="grid grid-cols-3 gap-4 font-mono text-sm">
            <div>
              <div className="text-white/50">ROUND</div>
              <div className="text-cyan-300 text-xl">{store.round}</div>
            </div>
            <div>
              <div className="text-white/50">COMBO</div>
              <div className="text-cyan-300 text-xl">{store.maxCombo}x</div>
            </div>
            <div>
              <div className="text-white/50">ACCURACY</div>
              <div className="text-cyan-300 text-xl">{stats.accuracy.toFixed(0)}%</div>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-4 w-full"
        >
          <button
            onClick={handlePlayAgain}
            className="touch-btn btn-neon btn-neon-green w-full py-8 font-arcade text-2xl rounded-lg"
            style={{ minHeight: '90px' }}
          >
            ▶ PLAY AGAIN
          </button>
          <button
            onClick={handleMainMenu}
            className="touch-btn btn-neon w-full py-6 font-arcade text-xl rounded-lg"
            style={{ minHeight: '70px' }}
          >
            MAIN MENU
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ControllerGameOverScreen;
