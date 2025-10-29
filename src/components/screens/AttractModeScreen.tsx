// src/components/screens/AttractModeScreen.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';

import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';
import { WELCOME_NARRATION } from '@/utils/narrationScript';

// 🔊 add this import (note lowercase file name)
import { getSound } from '@/utils/soundManager';

const AttractModeScreen: React.FC = () => {
  const { setScreen, highScore } = useGameWithLeaderboard();

  // read-only image status on this screen
  const { status } = useImageManager();
  const domain = status.leafPath;

  // narrator
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(false);
  const startedRef = useRef(false);
  const navigatingRef = useRef(false);

  // make sure captions are ON for first screen
  useEffect(() => {
    try { narrator.setCaptionsOn(true); } catch {}
  }, [narrator]);

  // Start flow: init audio, play click, await narration, then move on
  const handleStartGame = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    // 🔊 initialize audio on first user gesture
    try {
      const sound = getSound();
      sound.unlock();                  // iOS/Safari
      await sound.initializeSounds();  // load files + generate fallbacks
      sound.playSound('click');
    } catch {}

    setShowNarration(true);
    narrator.stop(); // clear leftovers

    try {
      await narrator.start(WELCOME_NARRATION); // wait until full script finishes
    } catch {
      // ignore; still proceed
    }

    if (!navigatingRef.current) {
      navigatingRef.current = true;
      setShowNarration(false);
      setScreen('nameEntry');
    }
  }, [narrator, setScreen]);

  // Keyboard shortcuts to start (also trigger audio click)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();

        // 🔊 give feedback on keyboard start too
        try {
          const sound = getSound();
          sound.unlock();
          void sound.initializeSounds().then(() => sound.playSound('click'));
        } catch {}

        void handleStartGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleStartGame]);

  const imageStatus = !domain
    ? 'WAITING (select dataset on next screen)'
    : status.initialized
    ? 'READY'
    : 'LOADING';

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
          style={{ filter: 'brightness(0.8) contrast(1.1)' }}
        >
          <source src="/Video/26475-360248610_small.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-10" />
      </div>

      <div className="crt-effect" />
      <div className="digital-rain" />

      {/* Main */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 z-20">
        <div className="flex flex-col items-center justify-center gap-16 w-full py-8">
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

          {/* Start button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full max-w-md"
          >
            <button
              onClick={() => void handleStartGame()}
              disabled={showNarration}
              className={`btn-neon pulse-glow w-full text-2xl py-4 ${showNarration ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              START
            </button>
          </motion.div>

          {/* System status */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="arcade-border p-8 w-full max-w-md mt-2 rounded-lg"
          >
            <h3 className="font-arcade text-xl text-glow-green mb-6 text-center">SYSTEM STATUS</h3>
            <div className="font-mono text-base space-y-3">
              <div className="flex justify-between"><span>GRAPHICS:</span><span className="text-glow-cyan">ONLINE</span></div>
              <div className="flex justify-between"><span>AUDIO:</span><span className="text-glow-cyan">ONLINE</span></div>
              <div className="flex justify-between"><span>NETWORK:</span><span className="text-glow-cyan">ONLINE</span></div>
              <div className="flex justify-between">
                <span>IMAGES:</span>
                <span className={!domain ? 'text-yellow-400' : status.initialized ? 'text-glow-cyan' : 'text-yellow-400'}>
                  {imageStatus}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Prompt */}
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
              ▲ PRESS START ▲
            </motion.p>
          </motion.div>
        </div>

        {/* High score */}
        {highScore > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-8 right-8 font-mono text-xs text-glow-yellow"
          >
            <div>HIGH SCORE: {highScore.toLocaleString()}</div>
          </motion.div>
        )}
      </div>

      {/* Narration overlay (visible for full sequence; user can skip) */}
      <NarrationOverlay
        visible={showNarration}
        statusText={narrator.status.toUpperCase()}
        caption={narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => {
          if (!navigatingRef.current) {
            navigatingRef.current = true;
            narrator.stop();
            setShowNarration(false);
            setScreen('nameEntry');
          }
        }}
        isPaused={narrator.status === 'paused'}
      />
    </div>
  );
};

export default AttractModeScreen;
