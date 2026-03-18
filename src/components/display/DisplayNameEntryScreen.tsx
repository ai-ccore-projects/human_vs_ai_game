// src/components/display/DisplayNameEntryScreen.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { GameSyncPayload } from '@/types/room';

interface Props {
  state: GameSyncPayload;
}

const DisplayNameEntryScreen: React.FC<Props> = ({ state }) => {
  const nameChars = (state.playerName || 'AAA').padEnd(3, 'A').split('');
  const arenaLabel = state.leafPath
    ? state.leafPath.split('/').pop()?.replace(/_/g, ' ') ?? ''
    : '';

  return (
    <div className="screen center relative">
      {/* Video Backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          autoPlay loop muted playsInline
          style={{ filter: 'brightness(0.8) contrast(1.1)' }}
        >
          <source src="/Video/172156-846731269_medium.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-10" />
      </div>

      <div className="crt-effect" />
      <div className="digital-rain" />

      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 z-20 gap-16">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="font-arcade text-4xl md:text-6xl text-glow-green mb-2">PLAYER SETUP</h1>
          <p className="font-mono text-lg text-glow-cyan">ENTERING NAME ON KIOSK</p>
        </motion.div>

        {/* Name display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="arcade-border p-10 rounded-lg"
        >
          <div className="flex justify-center gap-8">
            {nameChars.map((char, i) => (
              <div
                key={i}
                className="text-6xl md:text-8xl font-arcade text-center w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border-2 rounded-lg border-neon-green text-glow-green"
              >
                {char}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Arena selection */}
        {arenaLabel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="arcade-border p-6 rounded-md text-center"
          >
            <h3 className="font-arcade text-lg text-glow-blue mb-2">SELECTED ARENA</h3>
            <div className="font-mono text-2xl text-glow-cyan capitalize">{arenaLabel}</div>
          </motion.div>
        )}

        {/* Prompt */}
        <motion.div className="float text-center">
          <motion.p
            className="font-mono text-glow-green text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            SETTING UP ON KIOSK...
          </motion.p>
        </motion.div>
      </div>

      {/* Narration caption */}
      {state.narratorCaption && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-6">
          <div className="max-w-3xl mx-auto bg-black/80 rounded-lg border border-cyan-400 p-4">
            <span className="font-arcade text-lg text-glow">{state.narratorCaption}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayNameEntryScreen;
