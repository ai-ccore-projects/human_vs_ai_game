'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';
import { useGameLogic } from '@/hooks/useGameLogic';
import { ArcadeButton } from '../ui/ArcadeButton';
import { ArcadeHelper } from '../ui/ArcadeHelper';
import { ComboBanner } from '../ui/ComboBanner';

type HelperStatus = 'idle' | 'thinking' | 'correct' | 'wrong' | 'anxious';

/**
 * ULTIMATE ARCADE EXPERIENCE v2 - AI vs HUMAN
 * A more playful, focused, and kid-friendly arcade layout.
 */
export const GameScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();
  const { loadNextImage, isReady } = useImageManager();
  const gameLogic = useGameLogic();
  const [imageLoading, setImageLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [helperStatus, setHelperStatus] = useState<HelperStatus>('idle');

  // Handle image loading states and helper status
  useEffect(() => {
    if (gameStore.isPlaying && !gameStore.currentImage && isReady) {
      setImageLoading(true);
      setHelperStatus('thinking');
      loadNextImage().finally(() => {
        setImageLoading(false);
        setHelperStatus('idle');
      });
    } else if (gameStore.currentImage && imageLoading) {
      setImageLoading(false);
      setHelperStatus('idle');
    }
  }, [gameStore.isPlaying, gameStore.currentImage, isReady, loadNextImage, imageLoading]);

  // Handle answer feedback
  useEffect(() => {
    if (gameStore.lastResult) {
      setShowResult(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      
      if (gameStore.lastResult === 'correct') {
        const choice = gameStore.lastGuess ? 'AI' : 'HUMAN';
        const points = 100 + (gameStore.combo * 50);
        setFeedbackMessage(`YOU CHOSE ${choice}... CORRECT! +${points}`);
        setHelperStatus('correct');
      } else {
        const choice = gameStore.lastGuess ? 'AI' : 'HUMAN';
        const correctChoice = gameStore.lastGuess ? 'HUMAN' : 'AI';
        setFeedbackMessage(`YOU CHOSE ${choice}... WRONG! It was ${correctChoice}`);
        setHelperStatus('wrong');
      }

      const timeout = setTimeout(() => {
        setShowResult(false);
        setFeedbackMessage(null);
        setHelperStatus('idle');
      }, 1200);

      return () => clearTimeout(timeout);
    }
  }, [gameStore.lastResult, gameStore.combo, gameStore.currentImage]);

  // Handle player choice
  const makeChoice = useCallback((isAI: boolean) => {
    if (!gameStore.isPlaying || !gameStore.currentImage || showResult) return;
    gameStore.makeGuess(isAI);
  }, [gameStore, showResult]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStore.isPlaying) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          makeChoice(true);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          makeChoice(false);
          break;
        case 'Escape':
          event.preventDefault();
          gameStore.pauseGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStore, makeChoice]);

  // Timer calculations & helper status update
  const currentTimer = gameStore.timer || 30;
  const maxTimer = gameStore.maxTimer || 30;
  const timerProgress = Math.max(0, Math.min(100, (currentTimer / maxTimer) * 100));

  useEffect(() => {
    if (currentTimer < 10 && !showResult) {
      setHelperStatus('anxious');
    } else if (currentTimer >= 10 && helperStatus === 'anxious' && !showResult) {
      setHelperStatus('idle');
    }
  }, [currentTimer, helperStatus, showResult]);

  const screenVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    },
    initial: {
      x: 0,
    },
  };

  return (
    <motion.div 
      className="absolute inset-0 overflow-hidden bg-blue-900 flex flex-col"
      variants={screenVariants}
      animate={isShaking ? 'shake' : 'initial'}
    >
      
      {/* VIBRANT ARCADE BACKGROUND */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <motion.video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          animate={{
            filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <source src="/Video/56481-479644998_small.mp4" type="video/mp4" />
          {/*<source src="/Video/257777_small.mp4" type="video/mp4" />*/}
        </motion.video>
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6))]" />
      </div>

      {/* TOP BAR */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-b-4 border-yellow-400">
        <div className="flex justify-between items-center">
          {/* Player Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-arcade text-yellow-400 text-2xl">LIVES:</span>
              <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                    className={`w-8 h-8 rounded-full ${i < gameStore.lives ? 'bg-red-500 border-2 border-white' : 'bg-gray-700'}`}
                    animate={i < gameStore.lives ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
          </div>

          {/* Score + Combo */}
          <div className="text-center">
            <div className="font-arcade text-4xl text-white">SCORE</div>
            <div className="font-arcade text-5xl text-yellow-400">{gameStore.score.toLocaleString()}</div>
             <div className="font-arcade text-white text-2xl">ROUND {gameStore.round}</div>
            <div className="mt-2 flex justify-center">
              <ComboBanner combo={gameStore.combo} />
            </div>
            </div>

          {/* Timer */}
          <div className="flex items-center gap-4">
             <div>
                <div className="font-arcade text-2xl text-white">TIME</div>
                <div className="w-48 h-8 bg-gray-800 rounded-full border-2 border-white overflow-hidden">
            <motion.div
                    className="h-full bg-green-500"
                    style={{ width: `${timerProgress}%` }}
              animate={{
                        backgroundColor: timerProgress > 50 ? '#22c55e' : timerProgress > 25 ? '#f59e0b' : '#ef4444',
                    }}
                    />
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 relative flex items-center justify-center px-4">
        {/* Main Image Display */}
        <div className="relative w-full h-full max-w-3xl max-h-[70vh]">
          {/* Image Container */}
          <div className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent">
            {/* Scan sweep */}
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
              animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />
            <AnimatePresence mode="wait">
              {imageLoading ? (
                <motion.div
                  key="loading"
                  className="absolute inset-0 flex items-center justify-center bg-black/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="font-arcade text-4xl text-yellow-400 animate-pulse">LOADING...</div>
                </motion.div>
              ) : gameStore.currentImage ? (
                <motion.div
                  key={gameStore.currentImage.url}
                  className="w-full h-full"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src={gameStore.currentImage.url}
                    alt="Is it AI or Human?"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
                </div>

      {/* CONTROL PANEL */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-t-4 border-yellow-400">
          <div className="flex items-center justify-center gap-8">
              <ArcadeButton
                onClick={() => makeChoice(true)}
                disabled={!gameStore.currentImage || showResult || imageLoading}
                className="bg-red-500 border-red-700 text-white"
                hotkey="A"
                active={showResult && gameStore.lastGuess === true}
              >
                AI
              </ArcadeButton>

              <div className="flex flex-col items-center gap-2">
                <ArcadeHelper status={helperStatus} />
                <div className="font-arcade text-white text-2xl mt-2">PLAYER: {gameStore.playerName}</div>
              </div>

              <ArcadeButton
              onClick={() => makeChoice(false)}
              disabled={!gameStore.currentImage || showResult || imageLoading}
                className="bg-blue-500 border-blue-700 text-white"
                hotkey="D"
                active={showResult && gameStore.lastGuess === false}
              >
                HUMAN
              </ArcadeButton>
            </div>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {showResult && feedbackMessage && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`font-arcade text-4xl text-white text-center p-4 rounded-lg ${
                gameStore.lastResult === 'correct' 
                  ? 'bg-green-500/60' 
                  : 'bg-red-500/60'
              }`}
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               transition={{ duration: 0.25 }}
                >
                  {feedbackMessage}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      {gameStore.lives <= 0 && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="font-arcade text-8xl text-red-500 mb-4 animate-pulse">GAME OVER</h2>
          <p className="font-arcade text-4xl text-white">THE AI HAS WON</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GameScreen;