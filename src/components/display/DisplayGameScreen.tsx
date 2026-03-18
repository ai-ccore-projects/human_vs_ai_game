// src/components/display/DisplayGameScreen.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComboBanner } from '@/components/ui/ComboBanner';
import type { GameSyncPayload } from '@/types/room';

interface Props {
  state: GameSyncPayload;
}

const DisplayGameScreen: React.FC<Props> = ({ state }) => {
  const pair = state.currentPair;
  const roundMax = state.maxTimer || 10;
  const timerProgress = Math.max(0, Math.min(100, (state.timer / roundMax) * 100));

  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-blue-900 flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <motion.video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <source src="/Video/56481-479644998_small.mp4" type="video/mp4" />
        </motion.video>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6))]" />
      </div>

      {/* TOP BAR */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-b-4 border-yellow-400">
        <div className="flex justify-between items-center">
          {/* Lives */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-arcade text-yellow-400 text-2xl">LIVES:</span>
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-8 h-8 rounded-full ${i < state.lives ? 'bg-red-500 border-2 border-white' : 'bg-gray-700'}`}
                    animate={i < state.lives ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Score + Combo */}
          <div className="text-center">
            <div className="font-arcade text-4xl text-white">SCORE</div>
            <div className="font-arcade text-5xl text-yellow-400">{state.score.toLocaleString()}</div>
            <div className="font-arcade text-white text-2xl">ROUND {state.round}</div>
            <div className="mt-2 flex justify-center">
              <ComboBanner combo={state.combo} />
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-4">
            <div>
              <div className="font-arcade text-2xl text-white">TIME</div>
              <div className="w-48 h-8 bg-gray-800 rounded-full border-2 border-white overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ width: `${timerProgress}%`, backgroundColor: '#22c55e' }}
                  animate={{
                    backgroundColor:
                      timerProgress > 50 ? '#22c55e' :
                      timerProgress > 25 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN IMAGE AREA */}
      <div className="flex-1 relative flex items-center justify-center px-4">
        <div className="flex w-full max-w-6xl gap-8 justify-center">
          {/* LEFT IMAGE */}
          <div className="relative flex-1 max-w-[47%] h-[70vh]">
            <div className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent">
              <AnimatePresence mode="wait">
                {!pair?.images[0] ? (
                  <motion.div key="left-loading" className="absolute inset-0 flex items-center justify-center bg-black/80"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="font-arcade text-4xl text-yellow-400 animate-pulse">LOADING...</div>
                  </motion.div>
                ) : (
                  <motion.div key={pair.images[0].url} className="w-full h-full"
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.35 }}>
                    <img src={pair.images[0].url} alt="Left candidate" className="w-full h-full object-cover" />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Label */}
              <div className="absolute bottom-4 left-4 font-arcade text-2xl text-white bg-black/60 px-3 py-1 rounded">
                LEFT
              </div>
            </div>
          </div>

          {/* VS divider */}
          <div className="flex items-center">
            <motion.div
              className="font-arcade text-4xl text-glow-magenta"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              VS
            </motion.div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative flex-1 max-w-[47%] h-[70vh]">
            <div className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent">
              <AnimatePresence mode="wait">
                {!pair?.images[1] ? (
                  <motion.div key="right-loading" className="absolute inset-0 flex items-center justify-center bg-black/80"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="font-arcade text-4xl text-yellow-400 animate-pulse">LOADING...</div>
                  </motion.div>
                ) : (
                  <motion.div key={pair.images[1].url} className="w-full h-full"
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.35 }}>
                    <img src={pair.images[1].url} alt="Right candidate" className="w-full h-full object-cover" />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Label */}
              <div className="absolute bottom-4 right-4 font-arcade text-2xl text-white bg-black/60 px-3 py-1 rounded">
                RIGHT
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-t-4 border-yellow-400">
        <div className="flex items-center justify-center">
          <div className="font-arcade text-white text-2xl">
            PLAYER: {state.playerName}
          </div>
        </div>
      </div>

      {/* RESULT OVERLAY */}
      <AnimatePresence>
        {state.showResult && state.feedbackMessage && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={`font-arcade text-4xl text-white text-center p-6 rounded-lg ${
                state.lastResult === 'correct' ? 'bg-green-500/60' : 'bg-red-500/60'
              } max-w-3xl`}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div>{state.feedbackMessage}</div>

              {state.showMeta && state.metaText && (
                <div className="mt-4 text-left">
                  <div className="arcade-border bg-black/60 rounded p-3 max-h-56 overflow-y-auto">
                    <div className="text-lg font-mono text-yellow-300 mb-2">ARTWORK INFO</div>
                    <div className="text-sm text-white/90 whitespace-pre-wrap">{state.metaText}</div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOST CURTAIN */}
      {state.lives <= 0 && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="font-arcade text-8xl text-red-500 mb-4 animate-pulse">LOST</h2>
        </motion.div>
      )}

      {/* Narration caption */}
      {state.narratorCaption && (
        <div className="fixed bottom-20 inset-x-0 z-30 p-4">
          <div className="max-w-3xl mx-auto bg-black/80 rounded-lg border border-cyan-400 p-3">
            <span className="font-arcade text-base text-glow">{state.narratorCaption}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DisplayGameScreen;
