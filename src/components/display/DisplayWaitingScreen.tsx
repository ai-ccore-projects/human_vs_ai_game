// src/components/display/DisplayWaitingScreen.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { RoomConnectionStatus } from '@/types/room';

interface Props {
  roomCode: string | null;
  connectionStatus: RoomConnectionStatus;
}

const DisplayWaitingScreen: React.FC<Props> = ({ roomCode, connectionStatus }) => {
  return (
    <div className="screen center relative">
      {/* Video backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          autoPlay loop muted playsInline
          style={{ filter: 'brightness(0.6) contrast(1.1)' }}
        >
          <source src="/Video/26475-360248610_small.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 z-10" />
      </div>

      <div className="crt-effect" />
      <div className="digital-rain" />

      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 z-20 gap-16">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center"
        >
          <h1 className="font-arcade text-6xl md:text-8xl text-glow text-glitch mb-4">
            AI vs HUMAN
          </h1>
          <div className="font-mono text-xl text-glow-magenta">ARCADE EXPERIENCE</div>
        </motion.div>

        {/* Room Code */}
        {roomCode ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center"
          >
            <div className="font-mono text-2xl text-glow-cyan mb-6">
              ENTER THIS CODE ON THE KIOSK
            </div>
            <div className="arcade-border p-12 rounded-lg inline-block">
              <div className="font-arcade text-9xl md:text-[12rem] text-glow tracking-[0.3em]">
                {roomCode}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-xl text-glow-cyan animate-pulse"
          >
            GENERATING ROOM CODE...
          </motion.div>
        )}

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <motion.div
            className="font-mono text-lg text-glow-green"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {connectionStatus === 'connected'
              ? '● WAITING FOR CONTROLLER TO CONNECT...'
              : connectionStatus === 'connecting'
              ? '◌ CONNECTING...'
              : connectionStatus === 'error'
              ? '✕ CONNECTION ERROR — REFRESH TO RETRY'
              : '◌ INITIALIZING...'}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default DisplayWaitingScreen;
