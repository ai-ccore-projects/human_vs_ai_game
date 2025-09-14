'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';

/**
 * Attract Mode Screen - Simple and clean homepage design
 * Minimal interface focused on the core game experience
 */
export const AttractModeScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();
  const { initializeImages, isReady } = useImageManager();

  // Initialize image system on mount
  useEffect(() => {
    initializeImages();
  }, [initializeImages]);

  // Handle start game
  const handleStartGame = () => {
    if (!isReady) {
      console.warn('Image system not ready yet');
      return;
    }
    gameStore.setScreen('nameEntry');
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        handleStartGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isReady]);

  return (
    <div className="screen center relative">
      {/* Video Backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          autoPlay
          loop
          muted
          playsInline
          style={{
            filter: 'brightness(0.8) contrast(1.1)',
          }}
        >
          <source src="/Video/26475-360248610_small.mp4" type="video/mp4" />
        </video>
        {/* Video overlay to ensure readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-10"></div>
      </div>
      
      {/* Background Effects */}
      <div className="crt-effect"></div>
      <div className="digital-rain"></div>
      
      {/* Main Content - Arcade Welcome Screen Layout */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 z-20">
        
        {/* Arcade Welcome Screen Structure */}
        <div className="flex flex-col items-center justify-center gap-16 w-full py-8">
          
          {/* Game Title - Top */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
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
          
          {/* Start Game Button - Center */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full max-w-md"
          >
            <button 
              onClick={handleStartGame}
              disabled={!isReady}
              className={`btn-neon pulse-glow w-full text-2xl py-4 ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isReady ? 'START GAME' : 'LOADING...'}
            </button>
          </motion.div>
          
          {/* System Status - Center */}
         
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="arcade-border p-8 w-full max-w-md mt-2 rounded-lg"
      >
        <h3 className="font-arcade text-xl text-glow-green mb-6 text-center">
          SYSTEM STATUS
        </h3>
        <div className="font-mono text-base space-y-3">
          <div className="flex justify-between items-center">
            <span>GRAPHICS:</span>
            <span className="text-glow-cyan">ONLINE</span>
          </div>
          <div className="flex justify-between items-center">
            <span>AUDIO:</span>
            <span className="text-glow-cyan">ONLINE</span>
          </div>
          <div className="flex justify-between items-center">
            <span>NETWORK:</span>
            <span className="text-glow-cyan">ONLINE</span>
          </div>
          <div className="flex justify-between items-center">
            <span>IMAGES:</span>
            <span className={isReady ? 'text-glow-cyan' : 'text-yellow-400'}>
              {isReady ? 'READY' : 'LOADING'}
            </span>
          </div>
        </div>
</motion.div>
          
          {/* Ready to Play - Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="float text-center"
          >
            <motion.p 
              className="font-mono text-glow-green text-xl font-bold"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ▲ READY TO PLAY ▲
            </motion.p>
          </motion.div>
          
        </div>

        {/* High Score Display (if exists) */}
        {gameStore.highScore > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-8 right-8 font-mono text-xs text-glow-yellow"
          >
            <div>HIGH SCORE: {gameStore.highScore.toLocaleString()}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AttractModeScreen;
