// src/components/screens/GameOverScreen.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSubmitScore } from '@/hooks/useSubmitScore';
import { useHighScores } from '@/hooks/useHighScore';
import { GAME_OVER_NARRATION } from '@/utils/narrationScript';

// 🔊 Narration + captions
import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';

export const GameOverScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();

  // ===== VOICE: say "Game over." once, with captions =====
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(true);
  const startedRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const gestureHookedRef = useRef(false);

  const activeNarrationStates = ['speaking', 'paused', 'starting', 'queued'] as const;
  const narrationActive = activeNarrationStates.includes(narrator.status as any);
  const nextTick = () => new Promise<void>((r) => setTimeout(r, 0));


  useEffect(() => {
    try { narrator.setCaptionsOn(true); } catch {}
  }, [narrator]);
  
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
  
    (async () => {
      narrator.stop();     // flush leftovers
      await nextTick();    // let cancel settle
      try {
        await narrator.start(GAME_OVER_NARRATION(gameStore.score));
      } catch {
        // swallow
      }
  
      // If autoplay blocked, do a single gentle retry after 500ms
      if (!narrationActive && retryTimeoutRef.current == null) {
        retryTimeoutRef.current = window.setTimeout(async () => {
          if (!activeNarrationStates.includes(narrator.status as any)) {
            try {
              await narrator.start(GAME_OVER_NARRATION(gameStore.score));
            } catch {/* ignore */}
          }
        }, 500) as unknown as number;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrator, gameStore.score]);
  
  // gesture fallback: if still not active, first pointer/key re-starts TTS
  useEffect(() => {
    if (gestureHookedRef.current) return;
  
    const kick = async () => {
      if (!activeNarrationStates.includes(narrator.status as any)) {
        narrator.stop();
        await nextTick();
        try {
          await narrator.start(GAME_OVER_NARRATION(gameStore.score));
        } catch {/* ignore */}
      }
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  
    gestureHookedRef.current = true;
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown',   kick, { once: true });
  
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [narrator, gameStore.score]);
  
  // hide overlay when it’s no longer speaking
  useEffect(() => {
    if (!narrationActive) setShowNarration(false);
  }, [narrationActive]);
  
  // cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      narrator.stop();
    };
  }, [narrator]);
  
  

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
    const submitKey = `score:${payload.name}:${payload.score}:${payload.round}:${payload.maxCombo}`;

    (async () => {
      if (didSubmit) return;
      if (typeof window !== 'undefined' && sessionStorage.getItem(submitKey) === '1') {
        setDidSubmit(true);
        return;
      }
      const ok = await submit(payload);
      if (cancelled) return;

      if (ok && typeof window !== 'undefined') {
        sessionStorage.setItem(submitKey, '1');
      }
      setDidSubmit(true);
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

            {/* Top Scores (DB) */}
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

      {/* 🔊 VO + CC overlay */}
      <NarrationOverlay
        visible={showNarration || narrationActive}
        statusText={narrator.status.toUpperCase()}
        caption={narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => { narrator.stop(); setShowNarration(false); }}
        isPaused={narrator.status === 'paused'}
      />
    </div>
  );
};

export default GameOverScreen;
