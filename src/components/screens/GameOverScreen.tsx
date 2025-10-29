// src/components/screens/GameOverScreen.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSubmitScore } from '@/hooks/useSubmitScore';
import { useHighScores } from '@/hooks/useHighScore';

// 🔊 narrator + CC
import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';
import { GAME_OVER_NARRATION, type NarrationLine } from '@/utils/narrationScript';

const ACTIVE = ['speaking', 'paused', 'starting', 'queued'] as const;
const isActive = (s: string) => ACTIVE.includes(s as any);

const joinText = (lines: NarrationLine[]) =>
  lines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();

const GameOverScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();

  // ===== VOICE + CC (speak once) =====
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(true);
  const [fallbackCC, setFallbackCC] = useState<string | null>(null);

  const bootedRef = useRef(false);
  const attemptedFallbackRef = useRef(false);

  const script = useMemo(() => GAME_OVER_NARRATION(gameStore.score), [gameStore.score]);
  const fallbackText = useMemo(() => joinText(script), [script]);

  // Stop any audio/CC and hide overlay
  const stopAllAudio = () => {
    try { narrator.stop(); } catch {}
    try { (window as any)?.speechSynthesis?.cancel?.(); } catch {}
    setFallbackCC(null);
    setShowNarration(false);
  };

  // Native (one-time) fallback if autoplay blocks speech
  const nativeSpeakOnce = async (text: string) => {
    if (attemptedFallbackRef.current) return;
    attemptedFallbackRef.current = true;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try { window.speechSynthesis.cancel(); } catch {}
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onstart = () => {
      setFallbackCC(text);
      setShowNarration(true); // ensure panel is visible while speaking
    };
    u.onend = () => {
      setFallbackCC(null);
      setShowNarration(false); // hide when native speech ends
    };
    window.speechSynthesis.speak(u);
  };

  // Speak the GAME_OVER_NARRATION exactly once on mount
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try { narrator.setCaptionsOn(true); } catch {}
      // Cancel leftovers
      stopAllAudio();
      // Primary: segmented narration with CC
      await narrator.start(script);
      // If nothing actually started (autoplay blocked), do one native fallback
      setTimeout(() => {
        if (!isActive(narrator.status) && !fallbackCC) {
          void nativeSpeakOnce(fallbackText);
        }
      }, 300);
    })();

    return () => stopAllAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, fallbackText]);

  // Single gesture fallback: if both were blocked, first interaction will speak
  useEffect(() => {
    const kick = async () => {
      if (!isActive(narrator.status) && !fallbackCC) {
        stopAllAudio();
        await narrator.start(script);
        if (!isActive(narrator.status)) await nativeSpeakOnce(fallbackText);
      }
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [narrator.status, fallbackCC, narrator, script, fallbackText]);

  // Auto-hide CC panel once idle and no fallback caption
  useEffect(() => {
    if (!isActive(narrator.status) && !fallbackCC) {
      const t = setTimeout(() => setShowNarration(false), 200); // small debounce
      return () => clearTimeout(t);
    }
  }, [narrator.status, fallbackCC]);

  // ===== SCORE SUBMIT + LEADERBOARD =====
  const payload = useMemo(
    () => ({
      name: gameStore.playerName || 'AAA',
      score: gameStore.score || 0,
      round: gameStore.round || 1,
      maxCombo: gameStore.maxCombo || 0,
    }),
    [gameStore.playerName, gameStore.score, gameStore.round, gameStore.maxCombo]
  );

  const { submit, submitting, error: submitError } = useSubmitScore();
  const [didSubmit, setDidSubmit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = `score:${payload.name}:${payload.score}:${payload.round}:${payload.maxCombo}`;
    (async () => {
      if (didSubmit) return;
      if (typeof window !== 'undefined' && sessionStorage.getItem(key) === '1') {
        setDidSubmit(true);
        return;
      }
      const ok = await submit(payload);
      if (!cancelled) {
        if (ok && typeof window !== 'undefined') sessionStorage.setItem(key, '1');
        setDidSubmit(true);
      }
    })();
    return () => { cancelled = true; };
  }, [submit, payload, didSubmit]);

  const { items: top, loading: loadingTop, error: loadError } = useHighScores(10);

  // Navigation
  const handlePlayAgain = () => {
    stopAllAudio();
    gameStore.setScreen('nameEntry');          // go to NameEntryScreen.tsx
  };
  const handleMainMenu = () => {
    stopAllAudio();
    gameStore.goToAttractMode();               // go to AttractModeScreen.tsx
  };

  // Stats box
  const stats = gameStore.getStats();
  const performance = (() => {
    if (stats.accuracy >= 90) return { grade: 'S', color: 'neon-yellow', message: 'PERFECT!' };
    if (stats.accuracy >= 80) return { grade: 'A', color: 'neon-green', message: 'EXCELLENT!' };
    if (stats.accuracy >= 70) return { grade: 'B', color: 'neon-blue', message: 'GREAT!' };
    if (stats.accuracy >= 60) return { grade: 'C', color: 'neon-cyan', message: 'GOOD!' };
    if (stats.accuracy >= 50) return { grade: 'D', color: 'neon-orange', message: 'OKAY' };
    return { grade: 'F', color: 'neon-red', message: 'PRACTICE MORE!' };
  })();

  const overlayVisible = (isActive(narrator.status) || !!fallbackCC) && showNarration;

  return (
    <div className="screen center relative">
      <div className="crt-effect" />
      <div className="digital-rain opacity-20" />

      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-6xl mx-auto px-8 relative z-10">
        <div className="flex flex-col items-center justify-center gap-12 w-full py-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'backOut' }}
            className="text-center"
          >
            <h1 className="font-arcade text-6xl md:text-8xl text-glow-red mb-2">LOST</h1>
            <div className="min-h-5">
              {submitting && <div className="font-mono text-sm text-glow-cyan">Saving score…</div>}
              {submitError && (
                <div className="font-mono text-sm text-red-400">Couldn’t save score (offline?)</div>
              )}
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full"
          >
            {/* Final Score */}
            <div className="arcade-border p-8 text-center rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6">FINAL SCORE</h2>
              <div className="text-6xl font-arcade text-glow-yellow mb-4">
                {gameStore.score.toLocaleString()}
              </div>
              <div className="space-y-2 font-mono text-sm text-glow-cyan">
                <div>Player: {gameStore.playerName}</div>
                <div>Round: {gameStore.round}</div>
                <div>Max Combo: {gameStore.maxCombo}x</div>
              </div>
            </div>

            {/* Performance */}
            <div className="arcade-border p-8 text-center rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6">PERFORMANCE</h2>
              <div className={`text-8xl font-arcade text-${performance.color} mb-4`}>
                {performance.grade}
              </div>
              <div className={`font-mono text-lg text-${performance.color}`}>{performance.message}</div>
              <div className="mt-2 font-mono text-sm text-glow-cyan">
                Accuracy: {stats.accuracy.toFixed(1)}%
              </div>
            </div>

            {/* Top Scores */}
            <div className="arcade-border p-8 rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6 text-center">LEADERBOARD</h2>
              {loadingTop ? (
                <div className="text-center text-gray-300 font-mono">Loading…</div>
              ) : loadError ? (
                <div className="text-center text-red-400 font-mono">Error: {loadError}</div>
              ) : top.length === 0 ? (
                <div className="text-center text-gray-400 font-mono">No scores yet.</div>
              ) : (
                <div className="space-y-2">
                  {top.map((row, i) => (
                    <div
                      key={`${row.name}-${row.createdAt}-${i}`}
                      className={`flex items-center justify-between px-3 py-2 rounded ${
                        row.name === gameStore.playerName && row.score === gameStore.score
                          ? 'bg-neon-yellow/20 border border-neon-yellow'
                          : 'bg-gray-800/50'
                      }`}
                    >
                      <div className="font-mono text-sm text-neon-green flex items-center gap-3">
                        <span className="text-neon-yellow w-6 text-right">{i + 1}.</span>
                        <span>{row.name}</span>
                      </div>
                      <div className="font-mono text-sm text-neon-cyan">
                        {row.score.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-6"
          >
            <button onClick={handlePlayAgain} className="btn-neon pulse-glow text-2xl px-12 py-4">
              PLAY AGAIN
            </button>
            <button onClick={handleMainMenu} className="btn-neon-blue text-xl px-8 py-4">
              MAIN MENU
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center font-mono text-sm text-glow-cyan"
          >
            ENTER: Play Again • ESC: Main Menu
          </motion.div>
        </div>
      </div>

      {/* 🔊 VO + CC overlay (narrator segment CC or single native caption) */}
      <NarrationOverlay
        visible={overlayVisible}
        statusText={fallbackCC ? 'SPEAKING' : narrator.status.toUpperCase()}
        caption={fallbackCC ?? narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={stopAllAudio}
        isPaused={narrator.status === 'paused'}
      />
    </div>
  );
};

export default GameOverScreen;
