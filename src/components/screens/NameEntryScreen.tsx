'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';
import InterestDropdown from '@/components/ui/InterestDropDown';

import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';
import { INSTRUCTIONS_NARRATION } from '@/utils/narrationScript';

export const NameEntryScreen: React.FC = () => {
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

  // guards/timers
  const mountedOnceRef   = useRef(false);
  const retryTimeoutRef  = useRef<number | null>(null);
  const unlockTimeoutRef = useRef<number | null>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  // ------------------------------------------------------------------
  // Helpers
  const isActive = () =>
    narrator.status === 'speaking' || narrator.status === 'paused';

  const raf = () =>
    new Promise<void>((r) => requestAnimationFrame(() => r()));

  // Conservative cancel: avoid nuking the OS queue unless we must
  const softStop = useCallback(() => {
    try { narrator.stop?.(); } catch {}
  }, [narrator]);

  // ▶ Robust kick-off sequence (survives route transitions & autoplay)
  const startInstructions = useCallback(async () => {
    setShowNarration(true);

    // Ensure CC on
    try { narrator.setCaptionsOn?.(true); } catch {}

    // Give the browser a tick to settle after the route change
    await raf(); await raf();
    await new Promise((r) => setTimeout(r, 40)); // tiny post-mount delay

    // Clear any leftovers from previous screen
    softStop();

    try {
      await narrator.start(INSTRUCTIONS_NARRATION); // waits entire script
    } catch {
      // If start() throws, we’ll try a user-gesture unlock below
    }

    // If autoplay blocked, do one gentle retry shortly after
    if (!isActive() && retryTimeoutRef.current == null) {
      retryTimeoutRef.current = window.setTimeout(async () => {
        if (!isActive()) {
          softStop();
          try { await narrator.start(INSTRUCTIONS_NARRATION); } catch {}
        }
      }, 300) as unknown as number;
    }

    // If still not active after ~700ms, hook a one-time gesture unlock
    if (!isActive() && unlockTimeoutRef.current == null) {
      const unlock = async () => {
        softStop();
        try { await narrator.start(INSTRUCTIONS_NARRATION); } catch {}
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });

      unlockTimeoutRef.current = window.setTimeout(() => {
        // if user never interacts, we just leave overlay visible but silent
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      }, 5000) as unknown as number;
    }
  }, [narrator, softStop]);

  // Kick off narration once on mount
  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;
    void startInstructions();
  }, [startInstructions]);

  // Hide overlay automatically when narration is no longer active
  useEffect(() => {
    if (!isActive()) setShowNarration(false);
  }, [narrator.status]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
      softStop();
    };
  }, [softStop]);

  // ------------------------------------------------------------------
  // Name entry logic
  const selectCharacter = useCallback(
    (direction: 'up' | 'down') => {
      setCurrentName((prev) => {
        const next = [...prev];
        const currentCharIndex = alphabet.indexOf(next[selectedIndex]);
        if (direction === 'up') {
          next[selectedIndex] = alphabet[(currentCharIndex + 1) % alphabet.length];
        } else {
          next[selectedIndex] =
            alphabet[currentCharIndex === 0 ? alphabet.length - 1 : currentCharIndex - 1];
        }
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
      event.preventDefault();
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
          <h3 className="font-arcade text-lg text-glow-blue mb-4 text-center">
            CHOOSE YOUR ARENA
          </h3>

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
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
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

      {/* 🔊 VO + CC overlay — visible while speaking/paused OR until we decide to hide */}
      <NarrationOverlay
        visible={showNarration || narrator.status === 'speaking' || narrator.status === 'paused'}
        statusText={narrator.status.toUpperCase()}
        caption={narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn?.(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => { softStop(); setShowNarration(false); }}
        isPaused={narrator.status === 'paused'}
      />
    </div>
  );
};

export default NameEntryScreen;
