// src/components/controller/ControllerJoinScreen.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoomConnectionStatus } from '@/types/room';

interface Props {
  onJoin: (code: string) => void;
  connectionStatus: RoomConnectionStatus;
}

const ControllerJoinScreen: React.FC<Props> = ({ onJoin, connectionStatus }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (code.length >= 4) return;
    setCode((prev) => prev + digit);
    setError('');
  };

  const handleBackspace = () => {
    setCode((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setCode('');
    setError('');
  };

  const handleSubmit = () => {
    if (code.length !== 4) {
      setError('Enter all 4 digits');
      return;
    }
    onJoin(code);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'];

  return (
    <div className="game-container relative">
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

      <div className="screen center relative z-10">
        <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-2xl mx-auto px-8 gap-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="font-arcade text-4xl md:text-5xl text-glow mb-2">KIOSK CONTROLLER</h1>
            <p className="font-mono text-lg text-glow-cyan">Enter the room code shown on the TV</p>
          </motion.div>

          {/* Code display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="arcade-border p-8 rounded-lg w-full max-w-md"
          >
            <div className="flex justify-center gap-6 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-20 h-24 flex items-center justify-center rounded-lg border-4 font-arcade text-5xl transition-all duration-200 ${
                    code[i]
                      ? 'border-cyan-400 text-white bg-cyan-900/30 shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                      : 'border-gray-600 text-gray-600 bg-gray-900/50'
                  }`}
                >
                  {code[i] || '•'}
                </div>
              ))}
            </div>
            {error && (
              <div className="text-center font-mono text-red-400 text-sm mt-2">{error}</div>
            )}
            {connectionStatus === 'error' && (
              <div className="text-center font-mono text-red-400 text-sm mt-2">
                Connection error — check your network
              </div>
            )}
          </motion.div>

          {/* Touch keypad */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3 w-full max-w-md"
          >
            {digits.map((d) => (
              <button
                key={d}
                onClick={() => {
                  if (d === 'CLR') handleClear();
                  else if (d === '⌫') handleBackspace();
                  else handleDigit(d);
                }}
                className={`touch-btn font-arcade text-3xl rounded-lg border-2 transition-all active:scale-95 ${
                  d === 'CLR'
                    ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20 hover:bg-yellow-800/40'
                    : d === '⌫'
                    ? 'border-red-500 text-red-400 bg-red-900/20 hover:bg-red-800/40'
                    : 'border-cyan-400/50 text-white bg-gray-800 hover:bg-cyan-900/30 hover:border-cyan-400'
                }`}
                style={{ minHeight: '80px' }}
              >
                {d}
              </button>
            ))}
          </motion.div>

          {/* Join button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={handleSubmit}
            disabled={code.length !== 4 || connectionStatus === 'connecting'}
            className="btn-neon w-full max-w-md text-2xl py-6 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {connectionStatus === 'connecting' ? 'CONNECTING...' : 'JOIN ROOM'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ControllerJoinScreen;
