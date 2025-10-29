// src/app/(game)/NameEntryScreen.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';
import InterestDropdown from '@/components/ui/InterestDropDown';

import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';
import { INSTRUCTIONS_NARRATION } from '@/utils/narrationScript';

export default function NameEntryScreen() {
  const gameStore = useGameWithLeaderboard();
  const { setLeafFolder, resetImages } = useImageManager();

  // name entry
  const [currentName, setCurrentName] = useState(['A', 'A', 'A']);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEntering, setIsEntering] = useState(false);

  // dataset picker
  const [leafPath, setLeafPath] = useState<string | null>(null);

  // narration
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);

  // guards
  const mountedOnceRef = useRef(false);
  const hasSpokenRef = useRef(false);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  // --- TTS kick-off: speak immediately on mount, with gesture fallback ---
  const startInstructions = useCallback(() => {
    // Force CC on and keep overlay shown
    try { narrator.setCaptionsOn?.(true); } catch {}
    setShowNarration(true);
    setNeedsGesture(false);

    // Clear any queued utterances, then start
    try { narrator.stop?.(); } catch {}
    try { void narrator.start(INSTRUCTIONS_NARRATION); } catch {}

    // If autoplay is blocked, offer a one-tap unlock after a short probe
    setTimeout(() => {
      const active = narrator.status === 'speaking' || narrator.status === 'paused';
      if (!active) setNeedsGesture(true);
    }, 200);
  }, [narrator]);

  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;
    startInstructions(); // 🔊 speak on load
  }, [startInstructions]);

  // Track first time we actually enter "speaking"
  useEffect(() => {
    if (narrator.status === 'speaking') hasSpokenRef.current = true;
  }, [narrator.status]);

  // Only hide overlay after we have spoken at least once and returned to idle
  useEffect(() => {
    if (hasSpokenRef.current && narrator.status === 'idle') {
      setShowNarration(false);
    }
  }, [narrator.status]);

  // --- Name entry logic ---
  const selectCharacter = useCallback(
    (direction: 'up' | 'down') => {
      setCurrentName((prev) => {
        const next = [...prev];
        const i = alphabet.indexOf(next[selectedIndex]);
        next[selectedIndex] =
          direction === 'up'
            ? alphabet[(i + 1) % alphabet.length]
            : alphabet[i === 0 ? alphabet.length - 1 : i - 1];
        return next;
      });
    },
    [alphabet, selectedIndex]
  );

  const navigatePosition = useCallback((direction: 'left' | 'right') => {
    setSelectedIndex((prev) =>
      direction === 'left' ? (prev === 0 ? 2 : prev - 1) : (prev === 2 ? 0 : prev + 1)
    );
  }, []);

  const confirmName = useCallback(async () => {
    if (!leafPath) return;
    const name = currentName.join('');
    gameStore.setPlayerName(name);
    await setLeafFolder(leafPath);
    resetImages();
    setIsEntering(true);
    setTimeout(() => gameStore.startNewGame(), 800);
  }, [currentName, gameStore, leafPath, resetImages, setLeafFolder]);

  const goBack = useCallback(() => gameStore.setScreen('attract'), [gameStore]);

  // Keybindings
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const handled =
        ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','s','S','a','A','d','D','Enter',' ','Escape'].includes(event.key) ||
        (event.key.length === 1 && alphabet.includes(event.key.toUpperCase()));
      if (handled) event.preventDefault();

      switch (event.key) {
        case 'ArrowUp':
        case 'w': case 'W': selectCharacter('up'); break;
        case 'ArrowDown':
        case 's': case 'S': selectCharacter('down'); break;
        case 'ArrowLeft':
        case 'a': case 'A': navigatePosition('left'); break;
        case 'ArrowRight':
        case 'd': case 'D': navigatePosition('right'); break;
        case 'Enter':
        case ' ': confirmName(); break;
        case 'Escape': goBack(); break;
        default:
          if (event.key.length === 1 && alphabet.includes(event.key.toUpperCase())) {
            setCurrentName((prev) => {
              const next = [...prev];
              next[selectedIndex] = event.key.toUpperCase();
              return next;
            });
            if (selectedIndex < 2) setSelectedIndex((p) => p + 1);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectCharacter, navigatePosition, confirmName, goBack, selectedIndex, alphabet]);

  const canStart = currentName.join('').trim().length > 0 && !!leafPath;

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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 py-10 relative z-20 gap-12">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
          <h1 className="font-arcade text-4xl md:text-6xl text-glow-green mb-2">ENTER NAME</h1>
          <p className="font-mono text-lg text-glow-cyan">3 CHARACTERS MAXIMUM</p>
        </motion.div>

        {/* Name Input */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="arcade-border p-10 rounded-lg">
          <div className="flex justify-center gap-8">
            {currentName.map((char, index) => (
              <motion.div
                key={index}
                className={`relative ${selectedIndex === index ? 'selected' : ''}`}
                animate={selectedIndex === index ? { scale: [1, 1.1, 1], rotateY: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.5, repeat: selectedIndex === index ? Infinity : 0 }}
              >
                <div
                  className={`
                    text-6xl md:text-8xl font-arcade text-center
                    w-20 h-20 md:w-24 md:h-24 
                    flex items-center justify-center
                    border-2 rounded-lg
                    ${selectedIndex === index ? 'border-neon-cyan text-glow-cyan bg-neon-cyan/10' : 'border-neon-green text-glow-green'}
                  `}
                >
                  {char}
                </div>
                {selectedIndex === index && (
                  <>
                    <motion.div className="absolute -top-4 left-1/2 -translate-x-1/2 text-neon-cyan" animate={{ y: [-2, 2, -2] }} transition={{ duration: 1, repeat: Infinity }}>▲</motion.div>
                    <motion.div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-neon-cyan" animate={{ y: [2, -2, 2] }} transition={{ duration: 1, repeat: Infinity }}>▼</motion.div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Arena dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="w-full max-w-2xl arcade-border p-6 rounded-md"
        >
          <h3 className="font-arcade text-lg text-glow-blue mb-4 text-center">CHOOSE YOUR ARENA</h3>

          <InterestDropdown value={leafPath} onChange={setLeafPath} label="Pick a domain" />

          {leafPath && (
            <div className="text-xs text-white/60 mt-2">
              Selected: <span className="font-mono">{leafPath}</span>
            </div>
          )}
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w/full max-w-2xl"
        >
          <div className="arcade-border p-6 rounded-md">
            <h3 className="font-arcade text-lg text-glow-blue mb-3 text-center">NAVIGATION</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span>↑↓ or W/S:</span><span className="text-neon-cyan">Change Letter</span></div>
              <div className="flex justify-between"><span>←→ or A/D:</span><span className="text-neon-cyan">Move Position</span></div>
              <div className="flex justify-between"><span>Type:</span><span className="text-neon-cyan">Direct Input</span></div>
            </div>
          </div>
          <div className="arcade-border p-6 rounded-md">
            <h3 className="font-arcade text-lg text-glow-blue mb-3 text-center">ACTIONS</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span>ENTER:</span><span className="text-neon-green">Confirm Name</span></div>
              <div className="flex justify-between"><span>SPACE:</span><span className="text-neon-green">Start Game</span></div>
              <div className="flex justify-between"><span>ESC:</span><span className="text-neon-red">Go Back</span></div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex gap-6"
        >
          <button onClick={goBack} className="btn-neon-red px-8 py-3">← BACK</button>
          <motion.button
            onClick={confirmName}
            disabled={isEntering || !canStart}
            className={`btn-neon pulse-glow px-12 py-3 text-xl ${isEntering || !canStart ? 'opacity-50' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isEntering ? 'STARTING...' : 'START GAME'}
          </motion.button>
        </motion.div>

        {/* Preview */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }} className="text-center">
          <p className="font-mono text-sm text-glow-yellow">
            Player Name: <span className="text-neon-green font-bold">{currentName.join('')}</span>
          </p>
        </motion.div>

        {/* Entering overlay */}
        {isEntering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
          >
            <div className="text-center">
              <motion.div
                className="text-6xl font-arcade text-glow-green mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                INITIALIZING...
              </motion.div>
              <motion.div className="flex justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-neon-cyan rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Narration overlay – keep visible until we've spoken at least once */}
      <NarrationOverlay
        visible={showNarration || narrator.status === 'speaking' || narrator.status === 'paused'}
        statusText={narrator.status.toUpperCase()}
        caption={narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn?.(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => { try { narrator.stop(); } catch {} setShowNarration(false); }}
        isPaused={narrator.status === 'paused'}
      />

      {/* One-tap unlock if autoplay is blocked */}
      {needsGesture && showNarration && (
        <div className="absolute inset-x-0 bottom-10 z-30 flex justify-center">
          <button
            className="btn-neon px-4 py-2"
            onClick={() => {
              setNeedsGesture(false);
              try { narrator.stop(); } catch {}
              void narrator.start(INSTRUCTIONS_NARRATION);
            }}
          >
            Enable voice & play instructions
          </button>
        </div>
      )}
    </div>
  );
}
