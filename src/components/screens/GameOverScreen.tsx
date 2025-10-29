// src/components/screens/GameOverScreen.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSubmitScore } from '@/hooks/useSubmitScore';
import { useHighScores } from '@/hooks/useHighScore';
import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';
import { GAME_OVER_NARRATION, type NarrationLine } from '@/utils/narrationScript';

const ACTIVE = ['speaking', 'paused', 'starting', 'queued'] as const;
const isActive = (s: string) => ACTIVE.includes(s as any);
const joinText = (lines: NarrationLine[]) =>
  lines.map(l => l.text).join(' ').replace(/\s+/g, ' ').trim();

const GameOverScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();

  // ===== VOICE + CC =====
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(true);
  const [fallbackCC, setFallbackCC] = useState<string | null>(null);

  const spokenRef = useRef(false);            // ✅ ensure we speak once
  const fallbackTriedRef = useRef(false);     // ✅ native fallback only once

  const script = useMemo(() => GAME_OVER_NARRATION(gameStore.score), [gameStore.score]);
  const fallbackText = useMemo(() => joinText(script), [script]);

  // ---- typed helpers ----
  const cancelNative = useCallback((): void => {
    try { (window as any)?.speechSynthesis?.cancel?.(); } catch {}
  }, []);

  const nativeSpeakOnce = useCallback(async (text: string): Promise<void> => {
    if (fallbackTriedRef.current) return;
    fallbackTriedRef.current = true;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    cancelNative();
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 1.0;
    u.onstart = () => setFallbackCC(text);
    u.onend = () => setFallbackCC(null);
    window.speechSynthesis.speak(u);
  }, [cancelNative]);

  /** ✅ Properly typed, no self-reference */
  const stopAllAudio = useCallback((opts?: { hideCC?: boolean }): void => {
    try { narrator.stop(); } catch {}
    cancelNative();
    if (opts?.hideCC) {
      setFallbackCC(null);
      setShowNarration(false);
    }
  }, [narrator, cancelNative]);

  const speakOnce = useCallback(async (): Promise<void> => {
    if (spokenRef.current) return;
    spokenRef.current = true;

    // Make sure CC defaults to ON
    try { narrator.setCaptionsOn(true); } catch {}

    // Cancel leftovers (both engines) before speaking
    stopAllAudio();

    // Primary segmented narration
    await narrator.start(script);

    // If nothing started (autoplay blocked), do one native fallback
    setTimeout(() => {
      if (!isActive(narrator.status) && !fallbackCC) {
        void nativeSpeakOnce(fallbackText);
      }
    }, 250);
  }, [narrator, script, nativeSpeakOnce, fallbackText, fallbackCC, stopAllAudio]);

  // Kick off narration exactly once on mount
  useEffect(() => {
    void speakOnce();
    return () => stopAllAudio({ hideCC: true }); // cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single gesture fallback if *both* were blocked
  useEffect(() => {
    const kick = async () => {
      if (!isActive(narrator.status) && !fallbackCC) {
        stopAllAudio();
        await narrator.start(script);
        if (!isActive(narrator.status)) await nativeSpeakOnce(fallbackText);
      }
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown',   kick);
    };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown',   kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [narrator.status, fallbackCC, narrator, script, nativeSpeakOnce, fallbackText, stopAllAudio]);

  // Auto-hide CC when everything is idle
  useEffect(() => {
    if (!isActive(narrator.status) && !fallbackCC) setShowNarration(false);
  }, [narrator.status, fallbackCC]);

  // ===== SCORE SUBMIT + LEADERBOARD (unchanged) =====
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
        setDidSubmit(true); return;
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

  const handlePlayAgain = () => gameStore.setScreen('nameEntry');
  const handleMainMenu  = () => gameStore.goToAttractMode();

  const stats = gameStore.getStats();
  const performance = (() => {
    if (stats.accuracy >= 90) return { grade: 'S', color: 'neon-yellow', message: 'PERFECT!' };
    if (stats.accuracy >= 80) return { grade: 'A', color: 'neon-green', message: 'EXCELLENT!' };
    if (stats.accuracy >= 70) return { grade: 'B', color: 'neon-blue', message: 'GREAT!' };
    if (stats.accuracy >= 60) return { grade: 'C', color: 'neon-cyan', message: 'GOOD!' };
    if (stats.accuracy >= 50) return { grade: 'D', color: 'neon-orange', message: 'OKAY' };
    return { grade: 'F', color: 'neon-red', message: 'PRACTICE MORE!' };
  })();

  return (
    <div className="screen center relative">
      <div className="crt-effect" />
      <div className="digital-rain opacity-20" />

      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-6xl mx-auto px-8 relative z-10">
        <div className="flex flex-col items-center justify-center gap-12 w-full py-8">
          {/* Title */}
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'backOut' }} className="text-center">
            <h1 className="font-arcade text-6xl md:text-8xl text-glow-red mb-2">LOST</h1>
            <div className="min-h-5">
              {submitting && <div className="font-mono text-sm text-glow-cyan">Saving score…</div>}
              {submitError && <div className="font-mono text-sm text-red-400">Couldn’t save score (offline?)</div>}
            </div>
          </motion.div>

          {/* Summary / Performance / Leaderboard — unchanged UI */}
          {/* ... keep your existing three-column summary and buttons here ... */}

          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }} className="flex flex-col sm:flex-row gap-6">
            <button onClick={handlePlayAgain} className="btn-neon pulse-glow text-2xl px-12 py-4">PLAY AGAIN</button>
            <button onClick={handleMainMenu} className="btn-neon-blue text-xl px-8 py-4">MAIN MENU</button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="text-center font-mono text-sm text-glow-cyan">
            ENTER: Play Again • ESC: Main Menu
          </motion.div>
        </div>
      </div>

      {/* VO + CC overlay */}
      <NarrationOverlay
        visible={showNarration || isActive(narrator.status) || !!fallbackCC}
        statusText={fallbackCC ? 'SPEAKING' : narrator.status.toUpperCase()}
        caption={fallbackCC ?? narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => stopAllAudio({ hideCC: true })}   // ✅ stop everything & hide CC
        isPaused={narrator.status === 'paused'}
      />
    </div>
  );
};

export default GameOverScreen;
