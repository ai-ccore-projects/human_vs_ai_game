// src/components/display/DisplayGameOverScreen.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { GameSyncPayload } from '@/types/room';

interface Props {
  state: GameSyncPayload;
}

const DisplayGameOverScreen: React.FC<Props> = ({ state }) => {
  const performance = (() => {
    const acc = state.accuracy;
    if (acc >= 90) return { grade: 'S', color: 'neon-yellow', message: 'PERFECT!' };
    if (acc >= 80) return { grade: 'A', color: 'neon-green', message: 'EXCELLENT!' };
    if (acc >= 70) return { grade: 'B', color: 'neon-blue', message: 'GREAT!' };
    if (acc >= 60) return { grade: 'C', color: 'neon-cyan', message: 'GOOD!' };
    if (acc >= 50) return { grade: 'D', color: 'neon-orange', message: 'OKAY' };
    return { grade: 'F', color: 'neon-red', message: 'PRACTICE MORE!' };
  })();

  return (
    <div className="screen center relative">
      <div className="crt-effect" />
      <div className="digital-rain opacity-20" />

      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-6xl mx-auto px-8 relative z-10">
        <div className="flex flex-col items-center justify-center gap-12 w-full py-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'backOut' }}
            className="text-center"
          >
            <h1 className="font-arcade text-6xl md:text-8xl text-glow-red mb-2">LOST</h1>
          </motion.div>

          {/* Summary + Performance + Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full"
          >
            {/* Final Score */}
            <div className="arcade-border p-8 text-center rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6">FINAL SCORE</h2>
              <div className="text-6xl font-arcade text-glow-yellow mb-4">
                {state.score.toLocaleString()}
              </div>
              <div className="space-y-2 font-mono text-sm text-glow-cyan">
                <div>Player: {state.playerName}</div>
                <div>Round: {state.round}</div>
                <div>Max Combo: {state.maxCombo}x</div>
              </div>
            </div>

            {/* Performance */}
            <div className="arcade-border p-8 text-center rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6">PERFORMANCE</h2>
              <div className={`text-8xl font-arcade text-${performance.color} mb-4`}>{performance.grade}</div>
              <div className={`font-mono text-lg text-${performance.color}`}>{performance.message}</div>
              <div className="mt-2 font-mono text-sm text-glow-cyan">
                Accuracy: {state.accuracy.toFixed(1)}%
              </div>
            </div>

            {/* Leaderboard */}
            <div className="arcade-border p-8 rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6 text-center">LEADERBOARD</h2>
              {state.leaderboard.length === 0 ? (
                <div className="text-center text-gray-400 font-mono">No scores yet.</div>
              ) : (
                <div className="space-y-2">
                  {state.leaderboard.map((row, i) => {
                    const isSelf =
                      row.name === state.playerName &&
                      row.score === state.score &&
                      row.round === state.round;

                    return (
                      <div
                        key={`${row.name}-${row.createdAt}-${i}`}
                        className={`flex items-center justify-between px-3 rounded text-sm font-mono ${
                          isSelf
                            ? 'relative border border-neon-cyan bg-gray-800/70 shadow-[0_0_12px_2px_rgba(0,255,255,0.6)]'
                            : 'bg-gray-800/50'
                        }`}
                        style={{ height: '2.25rem' }}
                      >
                        <div className="flex items-center gap-3 text-neon-green overflow-hidden">
                          <span className="text-neon-yellow w-6 text-right">{i + 1}.</span>
                          <span className="truncate">{row.name}</span>
                        </div>
                        <div className="text-neon-cyan ml-auto tabular-nums">
                          {row.score.toLocaleString()}
                        </div>
                        {isSelf && (
                          <div className="absolute inset-0 rounded pointer-events-none pulse-glow" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Prompt */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center font-mono text-lg text-glow-cyan"
          >
            USE THE KIOSK TO PLAY AGAIN OR RETURN TO MENU
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DisplayGameOverScreen;
