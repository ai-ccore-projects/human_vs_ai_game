// src/components/screens/GameScreen.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';
import { ArcadeButton } from '../ui/ArcadeButton';
import { ArcadeHelper } from '../ui/ArcadeHelper';
import { ComboBanner } from '../ui/ComboBanner';
import type { GameImagePair, GameImage } from '@/types/game';

// 🔊 Narration + captions
import { useNarrator } from '@/hooks/useNarrator';
import NarrationOverlay from '@/components/ui/NarrationOverlay';
import { GAME_TIPS_NARRATION } from '@/utils/narrationScript';

type HelperStatus = 'idle' | 'thinking' | 'correct' | 'wrong' | 'anxious';

const RESULT_ONLY_MS = 1200;
const META_AUTO_ADVANCE_MS = 8000;
const DEFAULT_ROUND_TIME = 30;
const BASE_ROUND_TIME = 10;

// 🧠 Compute timer dynamically: halve every 3 rounds, minimum 2 seconds
const computeRoundTimer = (round: number) => {
  const halfSteps = Math.floor((round - 1) / 3); // 0 for rounds 1–3, 1 for 4–6, etc.
  const newTime = BASE_ROUND_TIME / Math.pow(2, halfSteps);
  return Math.max(newTime, 2);
};

const GameScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();
  const {
    initializeImages,
    isReady,
    loadNextPair,
    isLoading: imageLoading,
    status,
  } = useImageManager();

  const [pair, setPair] = useState<GameImagePair | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [helperStatus, setHelperStatus] = useState<HelperStatus>('idle');

  // Meta state
  const [metaText, setMetaText] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Flow control
  const [canGoNext, setCanGoNext] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local countdown (starts ticking only after narration finishes)
  const [timeLeft, setTimeLeft] = useState<number>(computeRoundTimer(1)); // start at 15 seconds

  // ====== NARRATION: speak gameplay tips; gate timer until finished ======
  const narrator = useNarrator();
  const [showNarration, setShowNarration] = useState(true);
  const startedTipsRef = useRef(false);

  // Treat only these as "actively narrating"
  const activeNarrationStates = ['speaking', 'paused', 'starting', 'queued'] as const;
  const narrationReady = narrator && !activeNarrationStates.includes(narrator.status as any);

  // Ensure CC is ON here
  useEffect(() => {
    try { narrator.setCaptionsOn(true); } catch {}
  }, [narrator]);

  // Start gameplay instructions once
  useEffect(() => {
    if (startedTipsRef.current) return;
    startedTipsRef.current = true;

    setShowNarration(true);
    narrator.stop(); // flush any leftovers
    void narrator.start(GAME_TIPS_NARRATION);
  }, [narrator]);

  // Hide overlay whenever narration is NOT active
  useEffect(() => {
    if (!activeNarrationStates.includes(narrator.status as any)) {
      setShowNarration(false);
    }
  }, [narrator.status]);

  // ====== helpers ======
  const extractNumberFromPair = (pr: GameImagePair | null): string | null => {
    if (!pr) return null;
    const url = pr.ai?.url || pr.human?.url || pr.images?.[0]?.url || '';
    const m = url.match(/\/(\d+)\.(png|jpe?g)$/i);
    return m ? m[1] : null;
  };

  const clearTimers = () => {
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
    if (autoTimerRef.current)   { clearTimeout(autoTimerRef.current);   autoTimerRef.current   = null; }
  };

  const proceedToNext = useCallback(() => {
    clearTimers();
    setShowResult(false);
    setShowMeta(false);
    setFeedbackMessage(null);
    setHelperStatus('idle');
    setMetaText(null);
    setMetaError(null);
    setCanGoNext(false);
    setPair(null);
    void (async () => {
      const p = await loadNextPair(gameStore.round);
      if (p) setPair(p);
    })();
    // deps: only things that actually change across rounds
  }, [loadNextPair, gameStore.round]);

  // ====== lifecycle ======
  useEffect(() => {
    initializeImages();
  }, [initializeImages]);

  useEffect(() => {
    (async () => {
      if (gameStore.isPlaying && isReady && status.leafPath && !pair && !imageLoading) {
        const p = await loadNextPair(gameStore.round);
        if (p) setPair(p);
      }
    })();
  }, [gameStore.isPlaying, isReady, status.leafPath, imageLoading, pair, loadNextPair, gameStore.round]);

  // Reset round timer whenever a new pair loads (countdown will wait for narration)
  useEffect(() => {
    if (!pair) return;
    const start = computeRoundTimer(gameStore.round);
    setTimeLeft(start);
    (gameStore as any).setTimer?.(start);
    // ⚠️ Intentionally do NOT depend on the whole store object to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, gameStore.maxTimer]);

  // Ticker: runs only while choosing AND after narration finishes
  useEffect(() => {
    if (!gameStore.isPlaying || !pair || showResult || showMeta || !narrationReady) return;

    const id = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [gameStore.isPlaying, pair, showResult, showMeta, narrationReady]);

  // Mirror timeLeft to store AFTER commit (only when narrationReady) without looping
  const lastPushedTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!gameStore.isPlaying || !pair || showResult || showMeta || !narrationReady) return;
    if (lastPushedTimerRef.current !== timeLeft) {
      (gameStore as any).setTimer?.(timeLeft);
      lastPushedTimerRef.current = timeLeft;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, gameStore.isPlaying, pair, showResult, showMeta, narrationReady]);

  // Time out => auto-fail (only after narrationReady)
  useEffect(() => {
    if (!pair || showResult || showMeta || timeLeft > 0 || !narrationReady) return;

    const aiImg: GameImage = pair.images[pair.aiIndex];
    (gameStore as any).setCurrentImage?.(aiImg);
    gameStore.makeGuess?.(false);

    setShowResult(true);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setFeedbackMessage(`TIME'S UP! AI WAS ${pair.aiIndex === 0 ? 'LEFT' : 'RIGHT'}`);
    setHelperStatus('wrong');

    const num = extractNumberFromPair(pair);
    const leaf = status.leafPath;
    setMetaText(null);
    setMetaError(null);
    setMetaLoading(true);

    (async () => {
      try {
        if (num && leaf) {
          const r = await fetch(`/api/meta?path=${encodeURIComponent(leaf)}&num=${encodeURIComponent(num)}`);
          const j = await r.json();
          if (r.ok && j?.text) setMetaText(String(j.text).trim());
          else setMetaError(j?.error || 'No meta info');
        } else {
          setMetaError('No meta info');
        }
      } catch {
        setMetaError('Failed to load meta info');
      } finally {
        setMetaLoading(false);
      }
    })();

    clearTimers();
    revealTimerRef.current = setTimeout(() => {
      setShowMeta(true);
      setCanGoNext(true);
      autoTimerRef.current = setTimeout(() => proceedToNext(), META_AUTO_ADVANCE_MS);
    }, RESULT_ONLY_MS);
    // ✔ removed gameStore from deps to avoid identity-driven loops
  }, [timeLeft, pair, showResult, showMeta, status.leafPath, proceedToNext, narrationReady]);

  // Helper mood
  useEffect(() => {
    if (showResult || showMeta || !narrationReady) return;
    if (timeLeft < 10) setHelperStatus('anxious');
    else if (helperStatus === 'anxious') setHelperStatus('idle');
  }, [timeLeft, showResult, showMeta, helperStatus, narrationReady]);

  // ====== interactions ======
  const handlePickSide = useCallback(
    async (picked: 0 | 1) => {
      if (!pair || showResult || !gameStore.isPlaying || !narrationReady) return;

      const pickedIsAI = picked === pair.aiIndex;

      const aiImg: GameImage = pair.images[pair.aiIndex];
      (gameStore as any).setCurrentImage?.(aiImg);
      gameStore.makeGuess?.(pickedIsAI);

      setShowResult(true);
      setShowMeta(false);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (pickedIsAI) {
        const points = 100 + gameStore.combo * 50;
        setFeedbackMessage(`YOU PICKED ${picked === 0 ? 'LEFT' : 'RIGHT'}... CORRECT! +${points}`);
        setHelperStatus('correct');
      } else {
        setFeedbackMessage(
          `YOU PICKED ${picked === 0 ? 'LEFT' : 'RIGHT'}... WRONG! AI WAS ${pair.aiIndex === 0 ? 'LEFT' : 'RIGHT'}`
        );
        setHelperStatus('wrong');
      }

      const num = extractNumberFromPair(pair);
      const leaf = status.leafPath;
      setMetaText(null);
      setMetaError(null);
      setMetaLoading(true);

      try {
        if (num && leaf) {
          const r = await fetch(`/api/meta?path=${encodeURIComponent(leaf)}&num=${encodeURIComponent(num)}`);
          const j = await r.json();
          if (r.ok && j?.text) setMetaText(String(j.text).trim());
          else setMetaError(j?.error || 'No meta info');
        } else {
          setMetaError('No meta info');
        }
      } catch {
        setMetaError('Failed to load meta info');
      } finally {
        setMetaLoading(false);
      }

      clearTimers();
      revealTimerRef.current = setTimeout(() => {
        setShowMeta(true);
        setCanGoNext(true);
        autoTimerRef.current = setTimeout(() => proceedToNext(), META_AUTO_ADVANCE_MS);
      }, RESULT_ONLY_MS);
    },
    [pair, showResult, gameStore.isPlaying, gameStore.combo, status.leafPath, proceedToNext, narrationReady]
  );

  // Hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!gameStore.isPlaying) return;

      if (!showResult && !showMeta && pair && narrationReady) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          e.preventDefault(); void handlePickSide(0);
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          e.preventDefault(); void handlePickSide(1);
        }
      } else if (showMeta && canGoNext) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); proceedToNext();
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        (gameStore as any).pauseGame?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameStore.isPlaying, pair, showResult, showMeta, canGoNext, handlePickSide, proceedToNext, narrationReady]);

  // --- render values ---
  const leftImg  = pair?.images[0];
  const rightImg = pair?.images[1];
  const roundMax = computeRoundTimer(gameStore.round);
  const timerProgress = Math.max(0, Math.min(100, (timeLeft / roundMax) * 100));
  const maxTimer      = Number(gameStore.maxTimer) || DEFAULT_ROUND_TIME;

  const screenVariants = { shake: { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } }, initial: { x: 0 } };

  const narrationOverlayVisible =
    showNarration || activeNarrationStates.includes(narrator.status as any);

  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-blue-900 flex flex-col"
      variants={screenVariants} animate={isShaking ? 'shake' : 'initial'}
    >
      {/* Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <motion.video autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <source src="/Video/56481-479644998_small.mp4" type="video/mp4" />
        </motion.video>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6))]" />
      </div>

      {/* TOP BAR */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-b-4 border-yellow-400">
        <div className="flex justify-between items-center">
          {/* Lives */}
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
            <div className="font-arcade text-5xl text-yellow-400">
              {gameStore.score.toLocaleString()}
            </div>
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
                  className="h-full"
                  style={{ width: `${timerProgress}%`, backgroundColor: '#22c55e' }}
                  animate={{
                    backgroundColor:
                      timerProgress > 50 ? '#22c55e' :
                      timerProgress > 25 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              {!narrationReady && (
                <div className="mt-2 text-center font-mono text-xs text-yellow-400">
                  Listening to instructions…
                </div>
              )}
              {imageLoading && narrationReady && (
                <div className="mt-2 text-center font-mono text-xs text-yellow-400">
                  Loading images…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 relative flex items-center justify-center px-4">
        <div className="flex w-full max-w-5xl gap-8 justify-center">
          {/* LEFT */}
          <button
            disabled={!pair || showResult || showMeta || imageLoading || !narrationReady}
            onClick={() => void handlePickSide(0)}
            className="relative flex-1 max-w-[45%] h-[70vh] group focus:outline-none"
          >
            <div className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent">
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                animate={{ y: ['-100%', '100%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
              <AnimatePresence mode="wait">
                {!pair?.images[0] ? (
                  <motion.div key="left-loading" className="absolute inset-0 flex items-center justify-center bg-black/80"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="font-arcade text-4xl text-yellow-400 animate-pulse">
                      LOADING...
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key={pair.images[0].url} className="w-full h-full"
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.35 }}>
                    <img src={pair.images[0].url} alt="Left candidate" className="w-full h-full object-cover"
                      onError={() => console.error('LEFT image failed:', pair.images[0].url)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-2 text-center font-arcade text-white opacity-70 group-hover:opacity-100">
              ← PICK LEFT AS AI
            </div>
          </button>

          {/* RIGHT */}
          <button
            disabled={!pair || showResult || showMeta || imageLoading || !narrationReady}
            onClick={() => void handlePickSide(1)}
            className="relative flex-1 max-w-[45%] h-[70vh] group focus:outline-none"
          >
            <div className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent">
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                animate={{ y: ['-100%', '100%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
              <AnimatePresence mode="wait">
                {!pair?.images[1] ? (
                  <motion.div key="right-loading" className="absolute inset-0 flex items-center justify-center bg-black/80"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="font-arcade text-4xl text-yellow-400 animate-pulse">
                      LOADING...
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key={pair.images[1].url} className="w-full h-full"
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.35 }}>
                    <img src={pair.images[1].url} alt="Right candidate" className="w-full h-full object-cover"
                      onError={() => console.error('RIGHT image failed:', pair.images[1].url)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-2 text-center font-arcade text-white opacity-70 group-hover:opacity-100">
              PICK RIGHT AS AI →
            </div>
          </button>
        </div>
      </div>

      {/* CONTROL PANEL */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-t-4 border-yellow-400">
        <div className="flex items-center justify-center gap-8">
          <ArcadeButton
            onClick={() => void handlePickSide(0)}
            disabled={!pair || showResult || showMeta || imageLoading || !narrationReady}
            className="bg-red-500 border-red-700 text-white"
            hotkey="A"
          >
            LEFT = AI
          </ArcadeButton>

          <div className="flex flex-col items-center gap-2">
            <ArcadeHelper status={helperStatus} />
            <div className="font-arcade text-white text-2xl mt-2">
              PLAYER: {gameStore.playerName}
            </div>
          </div>

          <ArcadeButton
            onClick={() => void handlePickSide(1)}
            disabled={!pair || showResult || showMeta || imageLoading || !narrationReady}
            className="bg-blue-500 border-blue-700 text-white"
            hotkey="D"
          >
            RIGHT = AI
          </ArcadeButton>
        </div>
      </div>

      {/* RESULT + META OVERLAY */}
      <AnimatePresence>
        {showResult && feedbackMessage && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={`font-arcade text-4xl text-white text-center p-4 rounded-lg ${
                helperStatus === 'correct' ? 'bg-green-500/60' : 'bg-red-500/60'
              } max-w-3xl pointer-events-auto`}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div>{feedbackMessage}</div>

              {showMeta && (
                <>
                  <div className="mt-4 text-left">
                    <div className="arcade-border bg-black/60 rounded p-3 max-h-56 overflow-y-auto">
                      <div className="text-lg font-mono text-yellow-300 mb-2">ARTWORK INFO</div>
                      {metaLoading && <div className="text-sm text-white/80">Loading details…</div>}
                      {metaError && <div className="text-sm text-red-200">{metaError}</div>}
                      {!!metaText && (
                        <div className="text-sm text-white/90 whitespace-pre-wrap">{metaText}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={proceedToNext}
                      disabled={!canGoNext}
                      className={`btn-neon px-8 py-2 text-xl ${!canGoNext ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      NEXT ▶
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-white/80">
                    Press <span className="text-yellow-300">Enter</span> or <span className="text-yellow-300">Space</span> to continue
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over overlay */}
      {gameStore.lives <= 0 && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="font-arcade text-8xl text-red-500 mb-4 animate-pulse">LOST</h2>
          <p className="font-arcade text-4xl text-white">THE AI HAS WON</p>
        </motion.div>
      )}

      {/* 🔊 VO + CC overlay — stays visible while speaking/paused */}
      <NarrationOverlay
        visible={narrationOverlayVisible}
        statusText={narrator.status.toUpperCase()}
        caption={narrator.currentCaption}
        captionsOn={narrator.captionsOn}
        onToggleCC={() => narrator.setCaptionsOn(!narrator.captionsOn)}
        onPause={narrator.pause}
        onResume={narrator.resume}
        onSkip={() => { narrator.stop(); setShowNarration(false); }}
        isPaused={narrator.status === 'paused'}
      />
    </motion.div>
  );
};

export default GameScreen;
