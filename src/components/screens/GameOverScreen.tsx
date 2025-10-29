// src/components/screens/GameOverScreen.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSubmitScore } from '@/hooks/useSubmitScore';
import { useHighScores } from '@/hooks/useHighScore';
import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';

const ACTIVE: Array<string> = ['speaking', 'paused', 'starting', 'queued'];

const GameOverScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();

  // === VOICE + CC ===
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(true);
  const [ccOverride, setCcOverride] = useState<string | null>(null); // CC when using native fallback

  const bootedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const gestureHookedRef = useRef(false);

  const isActive = () => ACTIVE.includes(narrator.status as any);
  const nextTick = () => new Promise<void>((r) => setTimeout(r, 0));
  const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

  const line =
    `Thank you for playing. Here is your score: ${gameStore.score}. ` +
    `If you'd like to play again, click Play Again.`;

  // ---- Native fallback (guaranteed) ----
  const nativeSpeak = async (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // cancel any queue
        try { window.speechSynthesis.cancel(); } catch {}
        await raf();

        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onstart = () => setCcOverride(text);
        u.onend = () => setCcOverride(null);
        window.speechSynthesis.speak(u);
        return true;
      }
    } catch {}
    return false;
  };

  // ---- Primary path: your narrator.start (string → segments) ----
  const narratorSpeak = async (text: string) => {
    try {
      await narrator.start(text as unknown as any);
    } catch { /* ignore */ }
    if (!isActive()) {
      try {
        await narrator.start([{ text, cc: text }] as unknown as any);
      } catch { /* swallow */ }
    }
    return isActive();
  };

  const speakNow = async () => {
    // stop leftovers (both narrator + native)
    try { narrator.stop(); } catch {}
    try { (window as any)?.speechSynthesis?.cancel?.(); } catch {}
    await nextTick(); // let cancellations settle
    await raf();

    // try narrator first
    let ok = await narratorSpeak(line);

    // small retry after a blink
    if (!ok) {
      await new Promise((r) => setTimeout(r, 250));
      ok = await narratorSpeak(line);
    }

    // last resort: native API + local CC override
    if (!ok) await nativeSpeak(line);
  };

  // Keep CC visible by default
  useEffect(() => {
    try { narrator.setCaptionsOn(true); } catch {}
  }, [narrator]);

  // Kick off TTS on mount
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      await speakNow();

      // one gentle retry if nothing started
      if (!isActive() && !ccOverride && retryTimerRef.current == null) {
        retryTimerRef.current = window.setTimeout(() => { void speakNow(); }, 400) as unknown as number;
      }
    })();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try { narrator.stop(); } catch {}
      try { (window as any)?.speechSynthesis?.cancel?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStore.score, narrator]);

  // One-time gesture fallback: first click/keypress re-speaks if still idle
  useEffect(() => {
    if (gestureHookedRef.current) return;

    const kick = async () => {
      if (!isActive() && !ccOverride) {
        await speakNow();
      }
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };

    gestureHookedRef.current = true;
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });

    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [ccOverride]);

  // Auto-hide CC panel once nothing is talking and no fallback CC
  useEffect(() => {
    if (!isActive() && !ccOverride) setShowNarration(false);
  }, [narrator.status, ccOverride]);

  // === SCORE SUBMIT + LEADERBOARD (unchanged) ===
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

  const handlePlayAgain = () => gameStore.setScreen('nameEntry');
  const handleMainMenu = () => gameStore.goToAttractMode();

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

      {/* VO + CC overlay (uses narrator caption OR fallback caption) */}
      <NarrationOverlay
        visible={showNarration || isActive() || !!ccOverride}
        statusText={(ccOverride ? 'SPEAKING' : narrator.status.toUpperCase())}
        caption={ccOverride ?? narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => { narrator.stop(); setCcOverride(null); setShowNarration(false); }}
        isPaused={narrator.status === 'paused'}
      />
    </div>
  );
};

export default GameOverScreen;
