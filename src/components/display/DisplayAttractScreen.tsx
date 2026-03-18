// src/components/display/DisplayAttractScreen.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { GameSyncPayload } from '@/types/room';

interface Props {
  state: GameSyncPayload;
}

const DisplayAttractScreen: React.FC<Props> = ({ state }) => {
  return (
    <div className="screen center relative">
      {/* Video Backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          autoPlay loop muted playsInline
          style={{ filter: 'brightness(0.8) contrast(1.1)' }}
        >
          <source src="/Video/26475-360248610_small.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-10" />
      </div>

      <div className="crt-effect" />
      <div className="digital-rain" />

      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 z-20 gap-16">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="font-arcade text-6xl md:text-8xl text-glow text-glitch mb-4">
            AI vs HUMAN
          </h1>
          <motion.div
            className="font-mono text-xl text-glow-magenta"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ARCADE EXPERIENCE
          </motion.div>
        </motion.div>

        {/* System status */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="arcade-border p-8 w-full max-w-md rounded-lg"
        >
          <div className="font-mono text-base space-y-3">
            <div className="flex justify-between"><span>GRAPHICS:</span><span className="text-glow-cyan">ONLINE</span></div>
            <div className="flex justify-between"><span>AUDIO:</span><span className="text-glow-cyan">ONLINE</span></div>
            <div className="flex justify-between"><span>NETWORK:</span><span className="text-glow-cyan">ONLINE</span></div>
            <div className="flex justify-between"><span>CONTROLLER:</span><span className="text-glow-cyan">CONNECTED</span></div>
          </div>
        </motion.div>

        {/* Prompt */}
        <motion.div className="float text-center">
          <motion.p
            className="font-mono text-glow-green text-xl font-bold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ▲ PRESS START ON THE KIOSK ▲
          </motion.p>
        </motion.div>
      </div>

      {/* Narration caption overlay */}
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

export default DisplayAttractScreen;
