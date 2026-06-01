// src/components/controller/ControllerGameScreen.tsx
'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/hooks/useSoundManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useImageManager } from '@/hooks/useImageManager';
import { useNarratorContext } from '@/contexts/NarratorContext';
import AccessibilityPanel from '@/components/ui/AccessibilityPanel';
import ReliableImage from '@/components/ui/ReliableImage';
import { preloadImage } from '@/utils/preloadImage';
import { GAME_TIPS_NARRATION } from '@/utils/narrationScript';

// Max consecutive unloadable pairs to skip before giving up on a round.
const MAX_SKIPS = 6;

const ControllerGameScreen: React.FC = () => {
  const store = useGameWithLeaderboard();
  const { soundManager } = useSound();
  const { loadNextPair, isReady, initializeImages, setLeafFolder } = useImageManager();
  const narrator = useNarratorContext();
  const narrationFiredRef = useRef(false);

  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [leftImage, setLeftImage] = useState<{ url: string; isAI: boolean } | null>(null);
  const [rightImage, setRightImage] = useState<{ url: string; isAI: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSide, setAiSide] = useState<'left' | 'right'>('left');
  const initRef = useRef(false);

  // Initialize and load first pair
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        // Make sure the image manager has a dataset. If it was lost (e.g. a hot
        // reload reset the singleton), recover from the arena the player picked.
        if (!isReady) {
          if (store.leafPath) {
            try { await setLeafFolder(store.leafPath); } catch { /* recovered below */ }
          }
          try { await initializeImages(); } catch { /* handled by loadNextImages */ }
        }
        await loadNextImages();
        // Play gameplay tips only on the very first round
        if (!narrationFiredRef.current) {
          narrationFiredRef.current = true;
          narrator.start(GAME_TIPS_NARRATION);
        }
      } catch (err) {
        console.error('[ControllerGame] Init error:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the next pair, but ONLY reveal it once both images are fully decoded.
  // Any pair that cannot be loaded is automatically skipped so the screen never
  // gets stuck on a blank/broken image — the round always renders something real.
  const loadNextImages = useCallback(async () => {
    setLoading(true);

    for (let skip = 0; skip < MAX_SKIPS; skip++) {
      try {
        let pair = await loadNextPair(store.round);

        // Dataset missing (singleton was reset)? Rebuild from the persisted arena.
        if (!pair && store.leafPath) {
          await setLeafFolder(store.leafPath);
          pair = await loadNextPair(store.round);
        }

        // No dataset at all — we can't play; send the player back to setup.
        if (!pair) {
          console.error('[ControllerGame] No dataset available — returning to name entry.');
          store.setScreen('nameEntry');
          setLoading(false);
          return;
        }

        const ai = (pair as any).ai ?? (pair as any).images?.find((i: any) => i.isAI);
        const human = (pair as any).human ?? (pair as any).images?.find((i: any) => !i.isAI);
        if (!ai?.url || !human?.url) continue; // malformed pair → skip

        // PRELOAD + DECODE both before showing anything.
        const [aiUrl, humanUrl] = await Promise.all([
          preloadImage(ai.url),
          preloadImage(human.url),
        ]);
        if (!aiUrl || !humanUrl) continue; // couldn't load → skip to the next pair

        const aiImg = { ...ai, url: aiUrl, isAI: true };
        const humanImg = { ...human, url: humanUrl, isAI: false };

        // Randomly assign AI to left or right
        const side = Math.random() < 0.5 ? 'left' : 'right';
        setAiSide(side);

        if (side === 'left') {
          setLeftImage({ url: aiUrl, isAI: true });
          setRightImage({ url: humanUrl, isAI: false });
          store.setCurrentPair({ images: [aiImg, humanImg], aiIndex: 0 });
        } else {
          setLeftImage({ url: humanUrl, isAI: false });
          setRightImage({ url: aiUrl, isAI: true });
          store.setCurrentPair({ images: [humanImg, aiImg], aiIndex: 1 });
        }

        store.setCurrentImage(aiImg);
        store.resetTimer();
        setLoading(false);
        return;
      } catch (err) {
        console.error('[ControllerGame] loadNextImages attempt failed, skipping:', err);
      }
    }

    // Exhausted our skip budget — surface a non-stuck state rather than hanging.
    console.error('[ControllerGame] Could not load a renderable pair after retries.');
    setLoading(false);
  }, [loadNextPair, setLeafFolder, store]);

  const handleGuess = useCallback(
    (guessedSide: 'left' | 'right') => {
      if (showResult || loading) return;

      const isCorrect = guessedSide === aiSide;

      if (isCorrect) {
        store.makeGuess(true);
        setLastResult('correct');
        setFeedbackMsg('✅ CORRECT!');
        if (soundManager) soundManager.playSound('correct', 0.6);
      } else {
        store.makeGuess(false);
        setLastResult('wrong');
        setFeedbackMsg('❌ WRONG!');
        if (soundManager) soundManager.playSound('wrong', 0.6);
      }

      setShowResult(true);
    },
    [showResult, loading, aiSide, store, soundManager]
  );

  const handleNext = useCallback(async () => {
    setShowResult(false);
    setLastResult(null);
    setFeedbackMsg('');
    await loadNextImages();
  }, [loadNextImages]);

  // Last-resort recovery: an already-decoded image failed at paint time (very
  // rare browser eviction). Pull a fresh pair instead of leaving a broken box.
  const handleImageFailure = useCallback(() => {
    if (!showResult) void loadNextImages();
  }, [showResult, loadNextImages]);

  // Timer ticking logic
  useEffect(() => {
    if (!store.isPlaying || loading || showResult) return;

    const id = setInterval(() => {
      store.decrementTimer();
    }, 1000);

    return () => clearInterval(id);
  }, [store.isPlaying, loading, showResult, store]);

  // Handle timeout
  useEffect(() => {
    if (store.timer === 0 && store.isPlaying && !loading && !showResult) {
      setLastResult('wrong');
      setFeedbackMsg(`TIME'S UP! AI WAS ${aiSide.toUpperCase()}`);
      if (soundManager) soundManager.playSound('wrong', 0.6);
      setShowResult(true);
    }
  }, [store.timer, store.isPlaying, loading, showResult, aiSide, soundManager]);

  // Timer display
  const roundMax = (store as any).maxTimer ?? 10;
  const timerPct = Math.max(0, Math.min(100, (store.timer / roundMax) * 100));

  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-blue-900 flex flex-col">
      <AccessibilityPanel />
      {/* Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <motion.video
          autoPlay loop muted playsInline
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
                    className={`w-8 h-8 rounded-full ${i < store.lives ? 'bg-red-500 border-2 border-white' : 'bg-gray-700'}`}
                    animate={i < store.lives ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Score + Combo */}
          <div className="text-center">
            <div className="font-arcade text-4xl text-white">SCORE</div>
            <div className="font-arcade text-5xl text-yellow-400">{store.score.toLocaleString()}</div>
            <div className="font-arcade text-white text-2xl">ROUND {store.round}</div>
            <div className="mt-2 flex justify-center">
              {store.combo >= 2 && (
                <div className="bg-gradient-to-r from-transparent via-cyan-900 to-transparent px-8 py-1 rounded">
                  <span className="font-arcade text-xl text-glow-cyan animate-pulse">COMBO x{store.combo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-4">
            <div>
              <div className="font-arcade text-2xl text-white">TIME</div>
              <div className="w-48 h-8 bg-gray-800 rounded-full border-2 border-white overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ width: `${timerPct}%`, backgroundColor: '#22c55e' }}
                  animate={{
                    backgroundColor:
                      timerPct > 50 ? '#22c55e' :
                      timerPct > 25 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN IMAGE AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4 pt-4">
        {/* Title for instructions */}
        <AnimatePresence mode="wait">
          {!showResult && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="absolute top-8 z-20 font-arcade text-3xl text-glow-cyan"
            >
              TAP WHICH IS AI
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex w-full max-w-6xl gap-8 justify-center mt-8">
          {/* LEFT IMAGE TOUCH TARGET */}
          <div className="relative flex-1 max-w-[47%] h-[65vh]">
            <button
              onClick={() => handleGuess('left')}
              disabled={loading || showResult}
              className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent transition-transform active:scale-95 hover:border-red-500/80 disabled:hover:border-black/60 disabled:active:scale-100"
            >
              {loading || !leftImage ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="font-arcade text-4xl text-yellow-400 animate-pulse">LOADING...</div>
                </div>
              ) : (
                <ReliableImage
                  src={leftImage.url}
                  alt="Left candidate"
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover"
                  onPermanentError={handleImageFailure}
                />
              )}
              <div className="absolute bottom-4 left-4 font-arcade text-2xl text-white bg-black/80 px-3 py-1 rounded border-2 border-red-500">
                LEFT
              </div>
            </button>
          </div>

          {/* VS divider */}
          <div className="flex items-center">
            <motion.div
              className="font-arcade text-4xl text-glow-magenta"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              VS
            </motion.div>
          </div>

          {/* RIGHT IMAGE TOUCH TARGET */}
          <div className="relative flex-1 max-w-[47%] h-[65vh]">
            <button
              onClick={() => handleGuess('right')}
              disabled={loading || showResult}
              className="w-full h-full rounded-lg overflow-hidden relative border-8 border-black/60 shadow-2xl bg-transparent transition-transform active:scale-95 hover:border-blue-500/80 disabled:hover:border-black/60 disabled:active:scale-100"
            >
              {loading || !rightImage ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="font-arcade text-4xl text-yellow-400 animate-pulse">LOADING...</div>
                </div>
              ) : (
                <ReliableImage
                  src={rightImage.url}
                  alt="Right candidate"
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover"
                  onPermanentError={handleImageFailure}
                />
              )}
              <div className="absolute bottom-4 right-4 font-arcade text-2xl text-white bg-black/80 px-3 py-1 rounded border-2 border-blue-500">
                RIGHT
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="relative z-10 w-full p-4 bg-black/50 border-t-4 border-yellow-400">
        <div className="flex items-center justify-center">
          <div className="font-arcade text-white text-2xl">
            PLAYER: {store.playerName || '???'}
          </div>
        </div>
      </div>

      {/* RESULT OVERLAY (Touch to continue) */}
      <AnimatePresence>
        {showResult && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            
            <motion.div
              className={`font-arcade text-5xl text-white text-center p-8 rounded-lg shadow-2xl mb-8 ${
                lastResult === 'correct' ? 'bg-green-500/90 border-4 border-green-300' : 'bg-red-500/90 border-4 border-red-300'
              } max-w-3xl`}
              initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <div>{feedbackMsg}</div>
            </motion.div>

            {/* Labels */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex gap-6 w-full max-w-2xl mb-12"
            >
              <div className={`flex-1 text-center font-arcade text-2xl rounded-lg py-4 border-4 shadow-xl ${
                aiSide === 'left' ? 'bg-red-900/80 text-red-300 border-red-500' : 'bg-blue-900/80 text-blue-300 border-blue-500'
              }`}>
                LEFT: {aiSide === 'left' ? '🤖 AI' : '🎨 HUMAN'}
              </div>
              <div className={`flex-1 text-center font-arcade text-2xl rounded-lg py-4 border-4 shadow-xl ${
                aiSide === 'right' ? 'bg-red-900/80 text-red-300 border-red-500' : 'bg-blue-900/80 text-blue-300 border-blue-500'
              }`}>
                RIGHT: {aiSide === 'right' ? '🤖 AI' : '🎨 HUMAN'}
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              onClick={handleNext}
              className="touch-btn btn-neon w-full max-w-md py-8 font-arcade text-4xl rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.4)]"
            >
              NEXT ▶
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOST CURTAIN */}
      {store.lives <= 0 && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="font-arcade text-8xl text-red-500 mb-4 animate-pulse">LOST</h2>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ControllerGameScreen;
